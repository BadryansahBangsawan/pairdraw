import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test')

const AGENT = { session: 'html-tools-session', kind: 'mcp', client: 'claude-code' }

/** A tool call as the MCP bridge delivers it, run by the app on its open document. */
function callTool(name: string, args: Record<string, unknown>) {
  return editor.page.evaluate(
    ({ name, args, agent }) => window.pairdraw?.test?.automation?.('tool', { name, args, agent }),
    { name, args, agent: AGENT }
  )
}

test('an agent imports HTML with Tailwind classes, styled by the browser', async () => {
  const response = await callTool('import_html', {
    html: '<div class="flex gap-2 p-4 bg-red-500"><div class="w-5 h-5 bg-blue-500"></div></div>',
    tailwind: true,
    x: 0,
    y: 0
  })
  expect(response).toMatchObject({ ok: true, result: { ids: [expect.any(String)] } })

  const row = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) return null
    const node = [...store.graph.getAllNodes()].find((item) => item.layoutMode === 'HORIZONTAL')
    return node
      ? { gap: node.itemSpacing, padding: node.paddingLeft, fills: node.fills.length }
      : null
  })
  expect(row).toEqual({ gap: 8, padding: 16, fills: 1 })
  editor.canvas.assertNoErrors()
})

test('an agent exports a standalone Tailwind page with the stylesheet the app bundles', async () => {
  const id = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const frame = store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Card',
      width: 120,
      height: 60,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    return frame.id
  })

  const response = await callTool('export_html', {
    ids: [id],
    style: 'tailwind',
    html: 'standalone',
    layer_ids: true
  })
  expect(response).toMatchObject({ ok: true })
  const html = String((response as { result?: { html?: string } } | undefined)?.result?.html)
  expect(html).toContain('bg-\\[\\#FF0000\\]')
  expect(html).toContain(`data-pairdraw-node-id="${id}"`)
  editor.canvas.assertNoErrors()
})
