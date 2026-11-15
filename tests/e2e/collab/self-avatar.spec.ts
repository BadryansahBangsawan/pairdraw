import { COLLABORATION_INCLUDED } from '@/constants'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup()

test.skip(COLLABORATION_INCLUDED, 'a build with live rooms always shows your avatar')

test('without live rooms, your avatar shows only while it carries your agents', async () => {
  const avatar = editor.page.getByTestId('collab-local-avatar')
  await expect(avatar).toHaveCount(0)

  const nodeId = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Card',
      x: 240,
      y: 160,
      width: 200,
      height: 120
    }).id
  })
  // A tool call as the MCP bridge delivers it, which adds the session's agent.
  await editor.page.evaluate(
    (id) =>
      window.pairdraw?.test?.automation?.('tool', {
        name: 'rename_node',
        args: { id, name: 'Checkout card' },
        agent: { session: 'session-1', kind: 'mcp', client: 'claude-code' }
      }),
    nodeId
  )
  await expect(avatar).toBeVisible()
  await expect(avatar).toContainText('1')

  await editor.page.evaluate(() =>
    window.pairdraw?.test?.automation?.('agent_session_closed', { session: 'session-1' })
  )
  await expect(avatar).toHaveCount(0)
  editor.canvas.assertNoErrors()
})
