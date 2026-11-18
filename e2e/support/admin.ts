import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getLocalStatus, getServiceRoleKey, readLocalEnv } from './local'

export const TEST_PASSWORD = 'Wanderlist123!'
const TEST_EMAIL_PREFIX = 'e2e.'
const TEST_EMAIL_DOMAIN = '@example.com'

export type TestUser = {
  id: string
  email: string
  password: string
  displayName: string
}

let adminClient: SupabaseClient | null = null

function admin(): SupabaseClient {
  if (adminClient) return adminClient
  const env = readLocalEnv()
  const status = getLocalStatus()
  if (env.url.replace(/\/$/, '') !== status.API_URL.replace(/\/$/, '')) {
    throw new Error('.env.local and the running Supabase stack point at different URLs.')
  }
  adminClient = createClient(status.API_URL, getServiceRoleKey(status), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
  return adminClient
}

export async function createTestUser(label = 'user'): Promise<TestUser> {
  const suffix = randomUUID().slice(0, 8)
  const email = `${TEST_EMAIL_PREFIX}${label}.${suffix}${TEST_EMAIL_DOMAIN}`
  const displayName = `E2E ${label} ${suffix.slice(0, 4)}`

  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })

  if (error || !data.user) {
    throw new Error(`Could not create test user: ${error?.message ?? 'unknown error'}`)
  }

  return {
    id: data.user.id,
    email,
    password: TEST_PASSWORD,
    displayName,
  }
}

export async function createTestUserWith(input: {
  email: string
  password: string
  displayName: string
}): Promise<TestUser> {
  const { data, error } = await admin().auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: input.displayName },
  })

  if (error || !data.user) {
    throw new Error(`Could not create test user: ${error?.message ?? 'unknown error'}`)
  }

  return {
    id: data.user.id,
    email: input.email,
    password: input.password,
    displayName: input.displayName,
  }
}

export async function createTripForUser(
  owner: TestUser,
  input: { name: string; destination?: string; description?: string } = {
    name: `E2E trip ${randomUUID().slice(0, 6)}`,
  },
): Promise<string> {
  const { data, error } = await admin()
    .from('trips')
    .insert({
      owner_id: owner.id,
      name: input.name,
      destination: input.destination ?? 'Test destination',
      description: input.description ?? 'Created by the Playwright suite.',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Could not create test trip: ${error.message}`)
  const row = data as { id: string } | null
  if (!row) throw new Error('Could not create test trip: empty response.')
  return row.id
}

export async function addTripMember(
  tripId: string,
  user: TestUser,
  role: 'editor' | 'viewer',
): Promise<void> {
  const { error } = await admin()
    .from('trip_members')
    .insert({ trip_id: tripId, user_id: user.id, role })
  if (error) throw new Error(`Could not add test member: ${error.message}`)
}

export async function addTripEditor(tripId: string, user: TestUser): Promise<void> {
  await addTripMember(tripId, user, 'editor')
}

export async function createPlaceForTrip(
  owner: TestUser,
  tripId: string,
  input: {
    name: string
    address?: string
    googleMapsUrl?: string
    notes?: string
    sortOrder?: number
  },
): Promise<string> {
  const { data, error } = await admin()
    .from('trip_items')
    .insert({
      trip_id: tripId,
      created_by: owner.id,
      name: input.name,
      address: input.address ?? null,
      google_maps_url: input.googleMapsUrl ?? null,
      notes: input.notes ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Could not create test place: ${error.message}`)
  const row = data as { id: string } | null
  if (!row) throw new Error('Could not create test place: empty response.')
  return row.id
}

export async function getTripMemberRole(tripId: string, userId: string): Promise<string | null> {
  const { data, error } = await admin()
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`Could not read trip member: ${error.message}`)
  const row = data as { role: string } | null
  return row?.role ?? null
}

export async function cleanupTestUsers(): Promise<void> {
  const client = admin()
  const perPage = 1000
  let page = 1

  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Could not list test users: ${error.message}`)

    const testUsers = data.users.filter(
      (user) =>
        typeof user.email === 'string' &&
        user.email.startsWith(TEST_EMAIL_PREFIX) &&
        user.email.endsWith(TEST_EMAIL_DOMAIN),
    )

    for (const user of testUsers) {
      const { error: deleteError } = await client.auth.admin.deleteUser(user.id)
      if (deleteError && deleteError.status !== 404) {
        throw new Error(`Could not delete test user ${user.email}: ${deleteError.message}`)
      }
    }

    if (data.users.length < perPage) break
    page += 1
  }
}
