import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test')

async function textState() {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const id = store.state.editingTextId
    const node = id ? store.graph.getNode(id) : undefined
    const te = store.textEditor
    return {
      editing: id !== null,
      text: node?.text ?? null,
      cursor: te?.state?.cursor ?? null,
      anchor: te?.state?.selectionAnchor ?? null
    }
  })
}

async function createTextAndType(value: string) {
  await editor.canvas.selectTool('text')
  await editor.canvas.click(200, 200)
  await expect.poll(async () => (await textState()).editing).toBe(true)
  await editor.page.keyboard.type(value)
  await expect.poll(async () => (await textState()).text).toBe(value)
}

test('undo while editing text removes the last typed character and keeps the caret', async () => {
  await createTextAndType('abc')
  await editor.page.keyboard.press('ControlOrMeta+z')
  await expect.poll(textState).toMatchObject({ editing: true, text: 'ab', cursor: 2, anchor: null })

  await editor.page.keyboard.press('ControlOrMeta+Shift+z')
  await expect
    .poll(textState)
    .toMatchObject({ editing: true, text: 'abc', cursor: 3, anchor: null })
})

test('undo steps back through a typing run one group at a time', async () => {
  await createTextAndType('abc')
  await editor.page.keyboard.press('ControlOrMeta+z')
  await editor.page.keyboard.press('ControlOrMeta+z')
  await expect.poll(textState).toMatchObject({ editing: true, text: 'a', cursor: 1 })
  await editor.page.keyboard.press('ControlOrMeta+z')
  await expect.poll(textState).toMatchObject({ editing: true, text: '', cursor: 0 })
})

test('undo after leaving text edit reverts the whole edit as one step', async () => {
  await createTextAndType('abc')
  await editor.page.keyboard.press('Escape')
  await expect.poll(async () => (await textState()).editing).toBe(false)
  await editor.canvas.undo()
  const after = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const texts = [...store.graph.nodes.values()].filter((node) => node.type === 'TEXT')
    return texts.map((node) => node.text)
  })
  expect(after).not.toContain('abc')
})
