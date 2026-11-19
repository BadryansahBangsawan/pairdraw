import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup()

interface Snapshot {
  nodes: string[]
  order: string[]
}

/** Every layer and the page's child order, which an undo step must restore exactly. */
async function snapshot(): Promise<Snapshot> {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const page = store.state.currentPageId
    return {
      nodes: [...store.graph.nodes.keys()].sort(),
      order: [...(store.graph.getNode(page)?.childIds ?? [])]
    }
  })
}

/** Runs an edit on the store, then checks undo and redo put the layers back either way. */
async function roundTrip(name: string, body: string) {
  const before = await snapshot()
  await editor.page.evaluate(async (source: string) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const action = new Function('store', `return (async () => { ${source} })()`) as (
      target: typeof store
    ) => Promise<void>
    await action(store)
  }, body)
  const after = await snapshot()
  expect(after, `${name} changed nothing`).not.toEqual(before)

  await editor.page.keyboard.press('ControlOrMeta+z')
  expect(await snapshot(), `${name}: undo`).toEqual(before)

  await editor.page.keyboard.press('ControlOrMeta+Shift+z')
  expect(await snapshot(), `${name}: redo`).toEqual(after)
}

async function twoShapes() {
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const first = store.createShape('RECTANGLE', 120, 120, 160, 120)
    const second = store.createShape('RECTANGLE', 200, 160, 160, 120)
    store.updateNode(first, {
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    store.updateNode(second, {
      strokes: [
        {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true,
          weight: 4,
          align: 'CENTER'
        }
      ]
    })
    store.select([first, second])
  })
}

test('flatten undoes and redoes as one step', async () => {
  await twoShapes()
  await roundTrip('Flatten', 'store.select([...store.state.selectedIds]); store.flattenSelected()')
})

test('outline stroke undoes and redoes as one step', async () => {
  await twoShapes()
  await roundTrip(
    'Outline stroke',
    'store.select([...store.state.selectedIds].slice(1)); store.outlineStrokeSelected()'
  )
})

test('paste undoes and redoes as one step', async () => {
  await twoShapes()
  await roundTrip(
    'Paste',
    'store.select([...store.state.selectedIds]); const copy = await store.prepareCopy(); store.pasteSnapshot(copy.snapshot)'
  )
})
