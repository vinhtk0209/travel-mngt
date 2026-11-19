import { supabase } from '@/lib/supabase/client'
import type { Provider } from '@supabase/supabase-js'
import type { Tables } from '@/lib/supabase/database.types'
import type { Locale } from '@/lib/supabase/database.types'

export type Profile = Tables<'profiles'>

export async function signInWithOAuth(provider: Provider, redirectTo: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updateProfile(
  userId: string,
  input: { display_name?: string; locale?: Locale },
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', userId)
    .select('*')
    .single()

  if (error) throw error
  return data
}
