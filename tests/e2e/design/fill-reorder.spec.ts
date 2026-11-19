import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'
import { propertyItems, propertySection } from '#tests/helpers/properties'

const editor = useEditorSetup()

function fillsOf(id: string) {
  return editor.page.evaluate((nodeId) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.graph.getNode(nodeId)?.fills ?? []
  }, id)
}

test('dragging a fill row reorders the fills, and undo restores them', async () => {
  await editor.canvas.drawRect(100, 100, 120, 80)
  await editor.canvas.waitForRender()
  const id = expectDefined(
    await editor.page.evaluate(() => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      return [...store.state.selectedIds][0] ?? null
    }),
    'selected id'
  )

  const fillSection = propertySection(editor.page, 'Fill')
  await fillSection.getByRole('button', { name: 'Add fill' }).click()
  await editor.canvas.waitForRender()

  // Give the second fill its own color so the order is observable.
  const hex = editor.page.locator('[data-property="fills"] [data-property="color-hex"]').nth(1)
  await hex.click()
  await hex.press('ControlOrMeta+a')
  await hex.pressSequentially('FF0000')
  await hex.press('Enter')
  await editor.canvas.waitForRender()
  const before = await fillsOf(id)
  expect(before).toHaveLength(2)

  const rows = propertyItems(editor.page, 'fills')
  const first = rows.nth(0)
  const second = rows.nth(1)
  const firstBox = expectDefined(await first.boundingBox(), 'first row box')
  const secondBox = expectDefined(await second.boundingBox(), 'second row box')
  // Start on the row itself, away from its controls, as a person grabs a row.
  await editor.page.mouse.move(secondBox.x + secondBox.width - 40, secondBox.y + 8)
  await editor.page.mouse.down()
  await editor.page.mouse.move(secondBox.x + secondBox.width - 40, secondBox.y - 6, { steps: 4 })
  await editor.page.mouse.move(firstBox.x + firstBox.width - 40, firstBox.y + 2, { steps: 8 })
  await expect(first).toHaveAttribute('data-drop', 'before')
  await editor.page.mouse.up()
  await editor.canvas.waitForRender()

  const after = await fillsOf(id)
  expect(after[0].color).toEqual(before[1].color)
  expect(after[1].color).toEqual(before[0].color)

  await editor.page.getByTestId('canvas-element').focus()
  await editor.page.keyboard.press('ControlOrMeta+z')
  await editor.canvas.waitForRender()
  const undone = await fillsOf(id)
  expect(undone[0].color).toEqual(before[0].color)
  expect(undone[1].color).toEqual(before[1].color)
})
