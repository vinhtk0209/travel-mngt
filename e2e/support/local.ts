import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type SupabaseStatus = {
  API_URL: string
  ANON_KEY?: string
  SERVICE_ROLE_KEY?: string
  SECRET_KEY?: string
  [key: string]: unknown
}

const LOCAL_URL_PATTERN = /^http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}\/?$/
let cachedStatus: SupabaseStatus | null = null

export function readLocalEnv(): { url: string; anonKey: string } {
  const envPath = resolve(process.cwd(), '.env.local')
  let contents: string
  try {
    contents = readFileSync(envPath, 'utf8')
  } catch {
    throw new Error(
      `Missing ${envPath}. Run the local Supabase stack and copy its URL/key into .env.local before running E2E tests.`,
    )
  }

  const values = new Map<string, string>()
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (!match) continue
    values.set(match[1], match[2].replace(/^['"]|['"]$/g, '').trim())
  }

  const url = values.get('VITE_SUPABASE_URL') ?? ''
  const anonKey = values.get('VITE_SUPABASE_ANON_KEY') ?? ''
  if (!LOCAL_URL_PATTERN.test(url)) {
    throw new Error(
      `E2E tests only run against local Supabase. .env.local points to "${url || '(missing)'}".`,
    )
  }
  if (!anonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY in .env.local.')
  }
  return { url, anonKey }
}

export function getLocalStatus(): SupabaseStatus {
  if (cachedStatus) return cachedStatus

  let output: string
  try {
    output = execSync('npx supabase status -o json', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Local Supabase is not reachable. Start Docker Desktop, then run "npx supabase start". Details: ${detail}`,
    )
  }

  const start = output.indexOf('{')
  const end = output.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error(`Could not parse "supabase status" output: ${output.slice(0, 300)}`)
  }

  const parsed = JSON.parse(output.slice(start, end + 1)) as SupabaseStatus
  if (!parsed.API_URL || !LOCAL_URL_PATTERN.test(parsed.API_URL)) {
    throw new Error(
      `Refusing to run E2E tests against non-local Supabase API "${parsed.API_URL ?? '(missing)'}".`,
    )
  }

  cachedStatus = parsed
  return parsed
}

export function getServiceRoleKey(status: SupabaseStatus): string {
  const key = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY
  if (!key) {
    throw new Error('Could not find a local service-role key in "supabase status" output.')
  }
  return key
}

export function assertLocalEnvironment(): void {
  readLocalEnv()
  getLocalStatus()
}
