import { expect, type Page } from '@playwright/test'

/**
 * Opens one of the app's menus from the brand menu at the start of the top bar, where File,
 * Edit, View, and the rest are submenus, and returns it. A menu closed while its opening animation
 * still runs stays in the page until the animation ends and dismisses the next menu opened in that
 * time, so this waits for every menu to go before clicking the brand.
 */
export async function openAppMenu(page: Page, name: string) {
  await expect(page.getByRole('menu')).toHaveCount(0)
  await page.getByTestId('app-main-menu').click()
  await page.getByRole('menuitem', { name, exact: true }).click()
  const menu = page.getByRole('menu', { name, exact: true })
  await expect(menu).toBeVisible()
  return menu
}
