import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

const RED = { r: 1, g: 0, b: 0, a: 1 }
const BLUE = { r: 0.2, g: 0.4, b: 1, a: 1 }

test.setTimeout(60_000)

/**
 * A graph whose rectangle fill is bound to a variable Figma deleted, plus a second rectangle on a
 * live variable. Deleted variables stay resolvable by ID (the file keeps their values) but are gone
 * from every list, so the panel must say why the pill still names one.
 */
async function boundDeletedVariable(page: Page) {
  return await page.evaluate(
    ({ red, blue }) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Editor unavailable')
      const graph = store.graph
      const colors = graph.createCollection('Colors')
      const live = graph.createVariable('Accent', 'COLOR', colors.id, red)
      const old = graph.createVariable('Old accent', 'COLOR', colors.id, red)
      const flag = graph.createVariable('Old flag', 'BOOLEAN', colors.id, true)
      const gap = graph.createVariable('Old gap', 'FLOAT', colors.id, 8)
      const removeAsDeleted = (id: string) => {
        const record = graph.variables.get(id)
        if (!record) throw new Error('Missing variable')
        graph.removeVariable(id)
        graph.addVariable({ ...record, deleted: true })
      }
      for (const variable of [old, flag, gap]) removeAsDeleted(variable.id)

      const deletedNode = store.createShape('RECTANGLE', 40, 40, 120, 90)
      const liveNode = store.createShape('RECTANGLE', 200, 40, 120, 90)
      store.updateNode(deletedNode, {
        name: 'Deleted bound',
        fills: [{ type: 'SOLID', color: blue, opacity: 1, visible: true }],
        strokes: [
          { type: 'SOLID', color: blue, opacity: 1, visible: true, weight: 2, align: 'CENTER' }
        ],
        strokeWeight: 2
      })
      store.updateNode(liveNode, {
        name: 'Live bound',
        fills: [{ type: 'SOLID', color: blue, opacity: 1, visible: true }]
      })
      graph.bindVariable(deletedNode, 'fills/0/color', old.id)
      graph.bindVariable(deletedNode, 'strokes/0/color', old.id)
      graph.bindVariable(liveNode, 'fills/0/color', live.id)
      graph.bindVariable(liveNode, 'visible', flag.id)
      graph.bindVariable(liveNode, 'opacity', gap.id)
      store.select([deletedNode])
      store.requestRender()
      return { deletedNode, liveNode, liveId: live.id, oldId: old.id }
    },
    { red: RED, blue: BLUE }
  )
}

for (const theme of ['light', 'dark'] as const) {
  test(`a fill bound to a deleted variable is marked in the ${theme} theme`, async ({ page }) => {
    await page.goto('/?test')
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    await page.evaluate(async (value) => {
      const path = '/src/app/shell/theme.ts'
      const module = await import(path)
      module.useAppTheme().setTheme(value)
    }, theme)
    await page.waitForFunction((value) => document.documentElement.dataset.theme === value, theme)

    const scene = await boundDeletedVariable(page)
    await canvas.waitForRender()

    const fill = page.getByRole('region', { name: 'Fill', exact: true })
    await expect(fill).toContainText('Old accent')
    const mark = fill.getByLabel('Old accent was deleted in the source file')
    await expect(mark).toBeVisible()
    await expect(fill).not.toContainText('Old accent was deleted in the source file')

    const stroke = page.getByRole('region', { name: 'Stroke', exact: true })
    await expect(stroke.getByLabel('Old accent was deleted in the source file')).toBeVisible()

    await page.evaluate((id) => window.pairdraw?.getStore?.().select([id]), scene.liveNode)
    await canvas.waitForRender()
    await expect(fill).toContainText('Accent')
    await expect(fill.getByLabel(/was deleted in the source file/)).toHaveCount(0)

    const appearance = page.getByRole('region', { name: 'Appearance', exact: true })
    await expect(appearance.getByLabel('Old flag was deleted in the source file')).toBeVisible()
    await expect(appearance.getByLabel('Old gap was deleted in the source file')).toBeVisible()
    await expect(page.getByLabel(/was deleted in the source file/)).toHaveCount(2)
    canvas.assertNoErrors()
  })
}
