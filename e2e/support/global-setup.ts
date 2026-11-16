import { cleanupTestUsers, createTestUser } from './admin'
import { clearMailbox } from './email'
import { assertLocalEnvironment } from './local'

export default async function globalSetup(): Promise<void> {
  assertLocalEnvironment()

  const probe = await createTestUser('setup')
  await cleanupTestUsers()
  if (probe.email === '') throw new Error('Test user creation returned an empty email.')

  await clearMailbox()
}
