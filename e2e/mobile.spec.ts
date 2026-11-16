import { expect, test } from '@playwright/test'
import { createTestUser } from './support/admin'
import {
  addPlaceViaUi,
  createTripViaUi,
  loginAs,
  placeRow,
  signOutViaUi,
  uniqueName,
} from './support/ui'

test.use({ viewport: { width: 390, height: 844 } })

test.describe('mobile layout', () => {
  test('stays within the viewport through the core trip flow', async ({ page }) => {
    const user = await createTestUser('mobile')
    const tripName = uniqueName('Mobile trip')
    const placeName = uniqueName('Mobile cafe')

    await loginAs(page, user)
    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
    await expect(page.locator('header nav')).toBeHidden()
    await expectNoHorizontalOverflow(page)

    const tripPath = await createTripViaUi(page, {
      name: tripName,
      destination: 'Saigon',
    })
    await expectNoHorizontalOverflow(page)

    await page.goto(tripPath)
    await expect(page.getByRole('heading', { name: tripName })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await addPlaceViaUi(page, {
      name: placeName,
      address: '14 Ton That Dam, District 1',
      notes: 'A tiny upstairs cafe.',
    })
    await expect(placeRow(page, placeName)).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await signOutViaUi(page)
  })
})

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(overflows).toBe(false)
}
