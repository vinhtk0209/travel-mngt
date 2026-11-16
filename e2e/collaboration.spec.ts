import { expect, test } from '@playwright/test'
import { createTestUser } from './support/admin'
import {
  acceptInvitationViaUi,
  addPlaceViaUi,
  createTripViaUi,
  inviteMemberThroughUi,
  loginAs,
  signOutViaUi,
  uniqueName,
} from './support/ui'

test.describe('collaboration', () => {
  test('owner invites an editor, then downgrades them to viewer', async ({ page }) => {
    const owner = await createTestUser('owner')
    const editor = await createTestUser('editor')
    const tripName = uniqueName('Shared trip')

    await loginAs(page, owner)
    const tripPath = await createTripViaUi(page, {
      name: tripName,
      destination: 'Ninh Binh',
    })

    const invitePath = await inviteMemberThroughUi(page, {
      tripPath,
      email: editor.email,
      role: 'editor',
    })
    await signOutViaUi(page)

    await loginAs(page, editor)
    await acceptInvitationViaUi(page, invitePath)
    await expect(page.getByRole('heading', { name: tripName })).toBeVisible()
    await addPlaceViaUi(page, {
      name: uniqueName('Editor pick'),
      notes: 'Added by the invited editor.',
    })
    await signOutViaUi(page)

    await loginAs(page, owner)
    await page.goto(`${tripPath}/settings`)
    const roleSelect = page.getByLabel(`Role for ${editor.displayName}`)
    await expect(roleSelect).toBeVisible()
    await roleSelect.selectOption('viewer')
    await expect(page.getByText('Member role updated')).toBeVisible()
    await signOutViaUi(page)

    await loginAs(page, editor)
    await page.goto(tripPath)
    await expect(page.getByText('View only', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Add place|Add your first place/ })).toHaveCount(0)
  })
})
