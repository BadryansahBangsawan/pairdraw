import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-rulers')

test('the preview bar stays above the letterbox and the scrim', async () => {
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Small',
      x: 0,
      y: 0,
      width: 200,
      height: 700
    })
  })
  await editor.page.keyboard.press('ControlOrMeta+Alt+Enter')
  await expect(editor.page.getByRole('button', { name: /Leave preview/ })).toBeVisible()
  const bars = editor.page.getByTestId('prototype-letterbox')
  await expect(bars.first()).toBeVisible()
  const wide = await bars.evaluateAll((rects) =>
    rects.map((rect) => rect.getBoundingClientRect().width)
  )
  expect(Math.max(...wide)).toBeGreaterThan(100)

  const buttons = await editor.page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-property^="preview-"]')].map((button) => {
      const rect = button.getBoundingClientRect()
      const at = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return {
        property: button.dataset.property,
        covered: at === button || button.contains(at)
      }
    })
  )
  expect(buttons).toHaveLength(2)
  for (const button of buttons) expect(button.covered).toBe(true)
})
