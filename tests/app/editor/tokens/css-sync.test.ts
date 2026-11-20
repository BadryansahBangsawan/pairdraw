import 'fake-indexeddb/auto'
import { afterEach, describe, expect, test } from 'bun:test'

import { readTokenSources } from '@pairdraw/scene-graph/token-sources'

import { createEditorStore } from '@/app/editor/session/create'
import {
  applyTokenCSSReview,
  pushTokenCSS,
  recordTokenCSSLink,
  resyncTokenCSS,
  setTokenCSSLink,
  tokenCSSDrift,
  tokenCSSLink,
  tokenDriftKey,
  unlinkTokenCSS
} from '@/app/editor/tokens/css-sync'

import { asDouble } from '#tests/helpers/doubles'

const CSS = ':root { --brand: #ff0000; --gap: 8px; }'

const stores: ReturnType<typeof createEditorStore>[] = []
afterEach(() => {
  for (const store of stores.splice(0)) {
    setTokenCSSLink(store, null)
    store.dispose()
  }
})

async function linkedStore() {
  const store = createEditorStore()
  stores.push(store)
  setTokenCSSLink(store, { id: 'app', name: 'app.css', text: CSS, watching: false })
  await recordTokenCSSLink(store)
  return store
}

function variable(store: ReturnType<typeof createEditorStore>, name: string) {
  const found = [...store.graph.variables.values()].find((entry) => entry.name === name)
  if (!found) throw new Error(`No ${name}`)
  return found
}

function changeCode(store: ReturnType<typeof createEditorStore>, css: string) {
  const link = tokenCSSLink(store).value
  if (link) link.text = css
}

describe('a stylesheet linked to the document', () => {
  test('is recorded on the document with what the code holds', async () => {
    const store = await linkedStore()
    expect(readTokenSources(store.graph)).toEqual([
      expect.objectContaining({ id: 'app', kind: 'css', name: 'app.css' })
    ])
    expect(variable(store, 'gap').type).toBe('FLOAT')
  })

  test('a re-sync brings code-only changes in as one undo step and keeps canvas edits', async () => {
    const store = await linkedStore()
    const brand = variable(store, 'brand')
    const [modeId] = Object.keys(brand.valuesByMode)
    store.updateVariableValue(brand.id, modeId, { r: 0, g: 0, b: 1, a: 1 })
    changeCode(store, CSS.replace('8px', '12px'))

    const result = await resyncTokenCSS(store)
    expect(result?.applied).toBe(1)
    expect(result?.review).toEqual([expect.objectContaining({ kind: 'canvas', variable: 'brand' })])
    expect(Object.values(variable(store, 'gap').valuesByMode)).toEqual([12])
    expect(variable(store, 'brand').valuesByMode[modeId]).toEqual({ r: 0, g: 0, b: 1, a: 1 })

    store.undo.undo()
    expect(Object.values(variable(store, 'gap').valuesByMode)).toEqual([8])
  })

  test('a review takes the side picked for each token', async () => {
    const store = await linkedStore()
    const brand = variable(store, 'brand')
    const [modeId] = Object.keys(brand.valuesByMode)
    store.updateVariableValue(brand.id, modeId, { r: 0, g: 0, b: 1, a: 1 })
    changeCode(store, CSS.replace('#ff0000', '#00ff00'))

    const drift = (await tokenCSSDrift(store)) ?? []
    expect(drift).toEqual([expect.objectContaining({ kind: 'conflict', variable: 'brand' })])
    await applyTokenCSSReview(store, new Map(drift.map((entry) => [tokenDriftKey(entry), 'code'])))
    expect(variable(store, 'brand').valuesByMode[modeId]).toMatchObject({ r: 0, g: 1, b: 0 })
    expect(await tokenCSSDrift(store)).toEqual([])
  })

  test('a value changed alike in both places, then in code, comes in by itself', async () => {
    const store = await linkedStore()
    const gap = variable(store, 'gap')
    const [modeId] = Object.keys(gap.valuesByMode)
    store.updateVariableValue(gap.id, modeId, 24)
    changeCode(store, CSS.replace('8px', '24px'))
    await resyncTokenCSS(store)
    changeCode(store, CSS.replace('8px', '32px'))

    const result = await resyncTokenCSS(store)
    expect(result).toEqual({ applied: 1, review: [] })
    expect(variable(store, 'gap').valuesByMode[modeId]).toBe(32)
  })

  test('after a push, a change made in code comes in by itself', async () => {
    const store = createEditorStore()
    stores.push(store)
    const file = { text: CSS }
    const handle = asDouble<FileSystemFileHandle>({
      kind: 'file',
      name: 'app.css',
      getFile: async () => new File([file.text], 'app.css', { type: 'text/css' }),
      createWritable: async () => ({
        write: async (data: string) => {
          file.text = data
        },
        close: async () => undefined
      })
    })
    setTokenCSSLink(store, { id: 'app', name: 'app.css', handle, text: CSS, watching: false })
    await recordTokenCSSLink(store)
    const gap = variable(store, 'gap')
    const [modeId] = Object.keys(gap.valuesByMode)
    store.updateVariableValue(gap.id, modeId, 24)
    expect((await pushTokenCSS(store))?.inPlace).toBe(true)
    file.text = file.text.replace('24px', '32px')

    expect(await resyncTokenCSS(store)).toEqual({ applied: 1, review: [] })
    expect(variable(store, 'gap').valuesByMode[modeId]).toBe(32)
  })

  test('unlinking forgets the link and keeps the variables', async () => {
    const store = await linkedStore()
    unlinkTokenCSS(store)
    expect(tokenCSSLink(store).value).toBeNull()
    expect(readTokenSources(store.graph)).toEqual([])
    expect(variable(store, 'brand')).toBeDefined()
  })
})
