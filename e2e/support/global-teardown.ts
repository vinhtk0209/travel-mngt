import { cleanupTestUsers } from './admin'

export default async function globalTeardown(): Promise<void> {
  await cleanupTestUsers()
}
