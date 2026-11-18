import type { FrameLocator, Locator, Page } from '@playwright/test'

/** The page or embedded frame a test drives; both open the sidebar through the same controls. */
type PanelScope = Page | FrameLocator

/**
 * Shows the design view in the left sidebar, opening the sidebar when it is closed. Selecting a
 * layer never does this for the person, so a test that edits properties asks for the view.
 */
export async function openDesignPanel(page: PanelScope): Promise<void> {
  if (!(await page.getByTestId('layers-panel').isVisible())) {
    const toggle = page.getByTestId('editor-toggle-layers-panel')
    // Specs run without chrome (`?no-chrome`) have no sidebar to open, and no panel to ask for.
    if (!(await toggle.isVisible())) return
    await toggle.click()
  }
  await page.getByTestId('left-panel-design-tab').click()
}

export function propertySection(page: Page, name: string): Locator {
  return page.getByRole('region', { name, exact: true })
}

/** The Design panel's header for the selected layer, found by the layer's name. */
export function layerHeader(page: Page, name: string): Locator {
  return page.locator('header').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

export function propertyField(page: Page, property: string): Locator {
  return page.locator(`[data-property=${JSON.stringify(property)}]`)
}

export function propertyItems(page: Page, property: string): Locator {
  return page.locator(`[data-property=${JSON.stringify(property)}][data-index]`)
}
