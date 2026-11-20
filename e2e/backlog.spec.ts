import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addTripMember, createPlaceForTrip, createTestUser, createTripForUser, getMessageMentions, type TestUser } from './support/admin'
import { loginAs } from './support/ui'

const evidence = join(process.cwd(), 'evidence', 'backlog')
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
test.beforeAll(() => mkdirSync(evidence, { recursive: true }))

test.describe.serial('collaboration backlog', () => {
  let owner: TestUser
  let viewer: TestUser
  let tripId: string

  test.beforeAll(async () => {
    owner = await createTestUser('backlog-owner')
    viewer = await createTestUser('backlog-viewer')
    tripId = await createTripForUser(owner)
    await addTripMember(tripId, viewer, 'viewer')
    await createPlaceForTrip(owner, tripId, { name: 'Photo stop' })
  })

  test('viewer chats, mentions, sees typing and read receipts', async ({ page, browser }) => {
    const peer = await browser.newPage()
    try {
      await loginAs(page, owner, `/trips/${tripId}?tab=chat`)
      await loginAs(peer, viewer, `/trips/${tripId}?tab=chat`)
      await expect(peer.getByLabel('Message the trip')).toBeVisible()
      await page.getByLabel('Message the trip').fill('@')
      await expect(peer.getByText(/typing/i)).toBeVisible()
      await page.getByRole('option', { name: new RegExp(viewer.displayName) }).click()
      await page.getByLabel('Message the trip').fill(`@${viewer.displayName} See you there`)
      await page.getByRole('button', { name: 'Send message' }).click()
      await expect(peer.getByText(`@${viewer.displayName} See you there`)).toBeVisible()
      await expect(peer.getByRole('button', { name: 'Notifications', exact: true })).toContainText('1')
      await expect(page.getByText(/Seen by/)).toBeVisible()
      await page.screenshot({ path: join(evidence, '01-chat-mentions-read.png'), fullPage: true })

      const bubble = page.locator('[data-chat-message]').filter({ hasText: 'See you there' })
      const messageId = await bubble.getAttribute('data-chat-message')
      expect(messageId).toBeTruthy()
      const messageBubble = page.locator(`[data-chat-message="${messageId}"]`)
      await bubble.getByRole('button', { name: 'Edit message' }).click()
      await bubble.getByRole('textbox', { name: 'Edit message' }).fill(`@${viewer.displayName} Meet at noon`)
      await page.getByRole('button', { name: 'Save changes' }).click()
      await expect(page.getByText('Edited')).toBeVisible()
      await expect.poll(() => getMessageMentions(messageId!)).toEqual([viewer.id])
      await page.screenshot({ path: join(evidence, '02-chat-edited.png'), fullPage: true })

      await messageBubble.getByRole('button', { name: 'Edit message' }).click()
      await messageBubble.getByRole('textbox', { name: 'Edit message' }).fill('Meet at noon, everyone')
      await messageBubble.getByRole('button', { name: 'Save changes' }).click()
      await expect.poll(() => getMessageMentions(messageId!)).toEqual([])
      await page.getByLabel('Message the trip').fill('@')
      await page.getByRole('option', { name: /@all/ }).click()
      await page.getByLabel('Message the trip').fill('@all New meeting point')
      await page.getByRole('button', { name: 'Send message' }).click()
      const everyone = page.locator('[data-chat-message]').filter({ hasText: '@all New meeting point' })
      await expect(everyone).toBeVisible()
      const everyoneId = await everyone.getAttribute('data-chat-message')
      await expect.poll(() => getMessageMentions(everyoneId!)).toEqual([viewer.id])
    } finally { await peer.close() }
  })

  test('members publish, react and comment in private trip feed', async ({ page, browser }) => {
    const peer = await browser.newPage()
    try {
      await loginAs(page, owner, `/trips/${tripId}?tab=feed`)
      await page.getByLabel('Share a trip update…').fill('First morning in the city')
      await page.getByLabel('Photos', { exact: true }).setInputFiles({ name: 'moment.png', mimeType: 'image/png', buffer: tinyPng })
      await page.getByRole('button', { name: 'Post', exact: true }).click()
      await expect(page.getByText('First morning in the city')).toBeVisible()
      await page.screenshot({ path: join(evidence, '03-feed-post.png'), fullPage: true })

      await loginAs(peer, viewer, `/trips/${tripId}?tab=feed`)
      await expect(peer.getByText('First morning in the city')).toBeVisible()
      await peer.getByRole('button', { name: 'React' }).click()
      await peer.getByRole('button', { name: '❤️' }).click()
      await peer.getByRole('textbox', { name: 'Write a comment' }).fill('Beautiful!')
      await peer.getByRole('button', { name: 'Write a comment' }).click()
      await expect(page.getByText('Beautiful!')).toBeVisible()
      await peer.screenshot({ path: join(evidence, '04-feed-reaction-comment.png'), fullPage: true })

      const post = page.locator('article').filter({ hasText: 'First morning in the city' })
      await post.getByRole('button', { name: 'Post options' }).click()
      await post.getByRole('button', { name: 'Pin post' }).click()
      await expect(post.getByText('Pinned')).toBeVisible()
      await post.getByRole('button', { name: 'Reply' }).click()
      await post.getByRole('textbox', { name: 'Write a comment' }).fill('Glad you liked it!')
      await post.getByRole('button', { name: 'Write a comment' }).click()
      await expect(peer.getByText('Glad you liked it!')).toBeVisible()
      await page.screenshot({ path: join(evidence, '10-feed-pinned-reply.png'), fullPage: true })
    } finally { await peer.close() }
  })

  test('avatar menu, language layout, dark popup and completed progress', async ({ page }) => {
    await loginAs(page, owner, '/profile')
    await page.getByRole('button', { name: 'Avatar options' }).click()
    await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible()
    await page.getByRole('button', { name: 'Change photo' }).click()
    await page.getByLabel('Choose an avatar photo').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: tinyPng })
    await expect(page.getByRole('dialog', { name: 'Crop your avatar' })).toBeVisible()
    await page.screenshot({ path: join(evidence, '05-avatar-crop.png'), fullPage: true })
    await page.getByRole('dialog', { name: 'Crop your avatar' }).getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('dialog', { name: 'Crop your avatar' })).toBeHidden()
    await page.getByRole('button', { name: 'Avatar options' }).click()
    await page.getByRole('button', { name: 'View photo' }).click()
    await expect(page.getByRole('dialog', { name: 'View photo' }).getByRole('img')).toBeVisible()
    await page.screenshot({ path: join(evidence, '06-avatar-view.png'), fullPage: true })

    await page.goto(`/trips/${tripId}/settings`)
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await page.getByRole('button', { name: 'Edit details' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveCSS('color', 'rgb(245, 239, 244)')
    await expect(dialog).toHaveCSS('background-color', 'rgb(32, 26, 36)')
    await page.screenshot({ path: join(evidence, '07-dark-settings-popup.png'), fullPage: true })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await page.setViewportSize({ width: 360, height: 760 })
    await page.getByRole('button', { name: 'Language' }).click()
    await expect(page.getByRole('menuitemradio', { name: 'Tiếng Việt' })).toBeVisible()
    await page.screenshot({ path: join(evidence, '08-mobile-language.png'), fullPage: true })

    await page.goto(`/trips/${tripId}`)
    await page.getByRole('button', { name: 'Mark as completed' }).click()
    await expect(page.getByRole('progressbar', { name: 'Trip completion' })).toHaveAttribute('aria-valuenow', '100')
    await page.screenshot({ path: join(evidence, '09-progress-complete.png'), fullPage: true })
  })
})
