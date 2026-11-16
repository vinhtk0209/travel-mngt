import { createClient } from '@supabase/supabase-js'

type InviteRole = 'editor' | 'viewer'

type InviteRequest = {
  tripId?: string
  email?: string
  role?: InviteRole
}

type TripRow = {
  id: string
  name: string
  destination: string | null
  owner_id: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const hex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const sha256 = async (value: string) => {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return hex(new Uint8Array(digest))
}

const buildInviteEmail = (options: {
  tripName: string
  destination: string
  inviterName: string
  role: InviteRole
  inviteLink: string
}) => {
  const trip = escapeHtml(options.tripName)
  const destination = escapeHtml(options.destination)
  const inviter = escapeHtml(options.inviterName)
  const role = options.role === 'editor' ? 'editor' : 'viewer'

  return `
    <div style="font-family: 'Nunito', Arial, sans-serif; background:#FFF8F2; padding:32px;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #F2E6DD;">
        <p style="font-size:14px;color:#9A8A94;margin:0 0 12px;">Wanderlist</p>
        <h1 style="font-size:26px;color:#3E2F3A;margin:0 0 12px;">Pack your bags, you're invited!</h1>
        <p style="font-size:16px;color:#6B5A66;line-height:1.6;margin:0 0 20px;">
          <strong>${inviter}</strong> invited you to plan <strong>${trip}</strong>${
            destination ? ` in ${destination}` : ''
          } as an <strong>${role}</strong>.
        </p>
        <a href="${options.inviteLink}"
           style="display:inline-block;background:#FF7059;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:700;">
          Open the trip
        </a>
        <p style="font-size:13px;color:#9A8A94;line-height:1.6;margin:24px 0 0;">
          This invitation expires in 7 days. If you weren't expecting it, you can safely ignore this email.
        </p>
      </div>
    </div>
  `
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Server is not configured for invitations' }, 500)
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing authorization header' }, 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user || !user.email) {
    return json({ error: 'You must be signed in to invite people' }, 401)
  }

  let body: InviteRequest
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const tripId = body.tripId?.trim()
  const email = body.email?.trim().toLowerCase()
  const role: InviteRole = body.role === 'viewer' ? 'viewer' : 'editor'

  if (!tripId || !/^[0-9a-f-]{36}$/i.test(tripId)) {
    return json({ error: 'A valid trip id is required' }, 400)
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'A valid email address is required' }, 400)
  }
  if (email === user.email.toLowerCase()) {
    return json({ error: 'You are already a member of this trip' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .select('id, name, destination, owner_id')
    .eq('id', tripId)
    .maybeSingle<TripRow>()

  if (tripError) {
    return json({ error: 'Could not load the trip' }, 500)
  }
  if (!trip) {
    return json({ error: 'Trip not found' }, 404)
  }
  if (trip.owner_id !== user.id) {
    return json({ error: 'Only the trip owner can invite members' }, 403)
  }

  const { data: recipientProfile } = await admin
    .from('profiles')
    .select('id, display_name')
    .eq('email', email)
    .maybeSingle<{ id: string; display_name: string }>()

  if (recipientProfile) {
    const { data: existingMember } = await admin
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', recipientProfile.id)
      .maybeSingle<{ id: string }>()

    if (existingMember) {
      return json({ error: 'This person is already a member of the trip' }, 409)
    }
  }

  const token = hex(crypto.getRandomValues(new Uint8Array(32)))
  const tokenHash = await sha256(token)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: pending } = await admin
    .from('trip_invitations')
    .select('id')
    .eq('trip_id', tripId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle<{ id: string }>()

  let invitationId: string

  if (pending) {
    const { data: updated, error: updateError } = await admin
      .from('trip_invitations')
      .update({
        role,
        invited_by: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .eq('id', pending.id)
      .select('id')
      .single<{ id: string }>()

    if (updateError || !updated) {
      return json({ error: 'Could not refresh the invitation' }, 500)
    }
    invitationId = updated.id
  } else {
    const { data: inserted, error: insertError } = await admin
      .from('trip_invitations')
      .insert({
        trip_id: tripId,
        email,
        role,
        invited_by: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single<{ id: string }>()

    if (insertError || !inserted) {
      return json({ error: 'Could not create the invitation' }, 500)
    }
    invitationId = inserted.id
  }

  const inviteLink = `${appUrl.replace(/\/$/, '')}/invite/${token}`

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('INVITE_FROM_EMAIL')
  let emailSent = false
  let emailError: string | null = null

  if (resendKey && fromEmail) {
    const { data: inviterProfile } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle<{ display_name: string }>()

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `You're invited to plan ${trip.name} on Wanderlist`,
        html: buildInviteEmail({
          tripName: trip.name,
          destination: trip.destination ?? '',
          inviterName: inviterProfile?.display_name ?? user.email ?? 'A fellow traveler',
          role,
          inviteLink,
        }),
      }),
    })

    emailSent = response.ok
    if (!response.ok) {
      emailError = `Email provider responded with ${response.status}`
    }
  } else {
    emailError = 'Email delivery is not configured; share the invite link manually'
  }

  return json({
    invitationId,
    inviteLink,
    emailSent,
    emailError,
  })
})
