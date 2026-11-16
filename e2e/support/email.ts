const MAILPIT_URL = 'http://127.0.0.1:54324'
const EMAIL_TIMEOUT_MS = 30_000
const POLL_INTERVAL_MS = 400

type MailpitAddress = { Address: string; Name?: string }

type MailpitMessageSummary = {
  ID: string
  To: MailpitAddress[]
  Subject: string
  Created: string
}

type MailpitListResponse = {
  messages: MailpitMessageSummary[]
}

export type MailpitMessage = {
  ID: string
  To: MailpitAddress[]
  Subject: string
  Text: string
  HTML: string
}

async function mailpit<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MAILPIT_URL}${path}`, init)
  if (!response.ok) {
    throw new Error(`Mailpit ${init?.method ?? 'GET'} ${path} failed with ${response.status}.`)
  }
  return (await response.json()) as T
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function clearMailbox(): Promise<void> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`Could not clear Mailpit: ${response.status}.`)
  }
}

export async function waitForEmail(
  recipient: string,
  subjectIncludes: string,
): Promise<MailpitMessage> {
  const deadline = Date.now() + EMAIL_TIMEOUT_MS
  const normalizedRecipient = recipient.toLowerCase()

  while (Date.now() < deadline) {
    const list = await mailpit<MailpitListResponse>('/api/v1/messages?limit=100')
    const match = list.messages.find(
      (message) =>
        message.Subject.toLowerCase().includes(subjectIncludes.toLowerCase()) &&
        message.To.some((to) => to.Address.toLowerCase() === normalizedRecipient),
    )
    if (match) {
      return mailpit<MailpitMessage>(`/api/v1/message/${encodeURIComponent(match.ID)}`)
    }
    await delay(POLL_INTERVAL_MS)
  }

  throw new Error(`No "${subjectIncludes}" email arrived for ${recipient} within 30 seconds.`)
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export function extractOtp(message: MailpitMessage): string {
  const html = decodeHtml(message.HTML)
  const highlighted = /<div[^>]*>\s*(\d{6})\s*<\/div>/i.exec(html)
  if (highlighted) return highlighted[1]

  const generic = /\b(\d{6})\b/.exec(html)
  if (generic) return generic[1]

  throw new Error(`Could not find a 6-digit code in the "${message.Subject}" email.`)
}

export function extractMagicLink(message: MailpitMessage): string {
  const html = decodeHtml(message.HTML)
  const match = /href="([^"]*\/auth\/v1\/verify[^"]*)"/i.exec(html)
  if (!match) {
    throw new Error(`Could not find a sign-in link in the "${message.Subject}" email.`)
  }
  return match[1]
}
