import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'

import * as figmaFactory from '@/app/automation/bridge/figma-factory'
import { createEditorStore } from '@/app/editor/session/create'
import { installPlugin, removePlugin, setPluginEnabled } from '@/app/plugins/catalog'
import { grantPlugin } from '@/app/plugins/grants'
import { PLUGIN_POINTER_CANCELLED_MESSAGE } from '@/app/plugins/messages'
import {
  addPluginPointerPoint,
  cancelPluginPointer,
  endPluginPointer,
  pluginPointerHolder
} from '@/app/plugins/pointer'
import { createPluginHost } from '@/app/plugins/sandbox/host'
import { PLUGIN_POINTER_CALL } from '@/app/plugins/sandbox/schema'
import type { InstalledPlugin } from '@/app/plugins/schema'

const stores: ReturnType<typeof createEditorStore>[] = []
let factory: ReturnType<typeof spyOn>

beforeEach(() => {
  // No canvas renders here; the tools only need the document.
  factory = spyOn(figmaFactory, 'makeFigmaFromStore').mockImplementation((editor, pageId) => {
    const api = new FigmaAPI(editor.graph)
    api.currentPage = api.wrapNode(pageId ?? editor.state.currentPageId)
    return api
  })
})

afterEach(() => {
  cancelPluginPointer()
  factory.mockRestore()
  for (const store of stores.splice(0)) store.dispose()
})

function openDocument() {
  const store = createEditorStore()
  stores.push(store)
  return store
}

/** One installed plugin asking for everything, granted exactly `grants`. */
function plugin(grants: string[]): InstalledPlugin[] {
  const installed = installPlugin(
    [],
    JSON.stringify({
      id: 'marks',
      name: 'Marks',
      version: '1.0.0',
      source: 'return 1',
      command: 'Mark',
      capabilities: ['document:read', 'document:write']
    })
  )
  if (!installed.ok) throw new Error(`install refused: ${installed.message}`)
  let plugins = installed.plugins
  for (const capability of grants) {
    const granted = grantPlugin(plugins, 'marks', [capability])
    if (!granted.ok) throw new Error(`grant refused: ${granted.message}`)
    plugins = granted.plugins
  }
  return plugins
}

const shape = { type: 'RECTANGLE', x: 0, y: 0, width: 40, height: 20 }

/** How long a refused pointer request may take before it is treated as still holding the canvas. */
const REFUSAL_WAIT_MS = 200

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** What a pointer request did: its rejection, `resolved`, or `pending` when it still holds on. */
function pointerRequestOutcome(request: Promise<unknown>): Promise<unknown> {
  return Promise.race([
    request.then(
      () => 'resolved',
      (error: unknown) => error
    ),
    wait(REFUSAL_WAIT_MS).then(() => 'pending')
  ])
}

test('a granted read answers with the tool result', async () => {
  const plugins = plugin(['document:read'])
  const host = createPluginHost(openDocument(), plugins, 'marks')
  expect(await host.call('get_selection', {})).toEqual({ selection: [] })
  host.finish(false)
})

test('a write lands as one undo step that undo takes away again', async () => {
  const store = openDocument()
  const host = createPluginHost(store, plugin(['document:write']), 'marks')
  const created = (await host.call('create_shape', shape)) as { id: string }
  expect(store.graph.getNode(created.id)).toBeDefined()
  host.finish(false)
  expect(store.undo.undo()).toBe('Plugin: marks')
  expect(store.graph.getNode(created.id)).toBeUndefined()
})

test('a failed run puts every write it made back', async () => {
  const store = openDocument()
  const host = createPluginHost(store, plugin(['document:write']), 'marks')
  const created = (await host.call('create_shape', shape)) as { id: string }
  host.finish(true)
  expect(store.graph.getNode(created.id)).toBeUndefined()
})

test('a call the plugin was not granted fails and edits nothing', async () => {
  const store = openDocument()
  const host = createPluginHost(store, plugin(['document:read']), 'marks')
  await expect(host.call('create_shape', shape)).rejects.toThrow(
    'This plugin was not granted "document:write".'
  )
  expect(store.graph.getChildren(store.state.currentPageId)).toHaveLength(0)
  host.finish(false)
})

test('disabling or removing the plugin during its run takes its grants away', async () => {
  const store = openDocument()
  const live: { plugins: readonly InstalledPlugin[] } = {
    plugins: plugin(['document:write'])
  }
  const host = createPluginHost(store, live.plugins, 'marks', () => live.plugins)

  live.plugins = [...setPluginEnabled(live.plugins, 'marks', false)]
  await expect(host.call('create_shape', shape)).rejects.toThrow('was not granted')

  live.plugins = plugin(['document:write'])
  live.plugins = removePlugin(live.plugins, 'marks')
  await expect(host.call('create_shape', shape)).rejects.toThrow('was not granted')

  expect(store.graph.getChildren(store.state.currentPageId)).toHaveLength(0)
  host.finish(true)
})

test('a call still in flight when the run ends edits nothing', async () => {
  const store = openDocument()
  const host = createPluginHost(store, plugin(['document:write']), 'marks')
  const pending = host.call('create_shape', shape)
  host.finish(true)
  await expect(pending).rejects.toThrow('The plugin run has ended.')
  expect(store.graph.getChildren(store.state.currentPageId)).toHaveLength(0)

  // A successful run closes its step the same way: an unawaited write must not land after it.
  const later = createPluginHost(store, plugin(['document:write']), 'marks')
  const unawaited = later.call('create_shape', shape)
  later.finish(false)
  await expect(unawaited).rejects.toThrow('The plugin run has ended.')
  expect(store.graph.getChildren(store.state.currentPageId)).toHaveLength(0)
  expect(store.undo.undo()).toBeNull()
})

test('an unknown tool fails by name', async () => {
  const host = createPluginHost(openDocument(), plugin(['document:read']), 'marks')
  await expect(host.call('make_coffee', {})).rejects.toThrow('No tool named "make_coffee".')
  host.finish(false)
})

test('a disabled plugin is refused every call', async () => {
  const plugins = setPluginEnabled(plugin(['document:read']), 'marks', false)
  const host = createPluginHost(openDocument(), plugins, 'marks')
  await expect(host.call('get_selection', {})).rejects.toThrow('was not granted')
  host.finish(false)
})

test('the pointer call takes the canvas pointer without a tool lookup or a grant', async () => {
  const host = createPluginHost(openDocument(), plugin([]), 'marks')
  const sequence = host.call(PLUGIN_POINTER_CALL, {})
  expect(pluginPointerHolder.value).toBe('marks')
  addPluginPointerPoint({ x: 4, y: 5 })
  endPluginPointer()
  expect(await sequence).toEqual([{ x: 4, y: 5 }])
  host.finish(false)
})

test('a sequence that ends by release keeps the run able to ask again', async () => {
  const host = createPluginHost(openDocument(), plugin([]), 'marks')
  const first = host.call(PLUGIN_POINTER_CALL, {})
  addPluginPointerPoint({ x: 1, y: 2 })
  endPluginPointer()
  expect(await first).toEqual([{ x: 1, y: 2 }])

  const second = host.call(PLUGIN_POINTER_CALL, {})
  expect(pluginPointerHolder.value).toBe('marks')
  endPluginPointer()
  expect(await second).toEqual([])
  host.finish(false)
})

test('a run whose sequence the user cancelled cannot take the pointer again', async () => {
  const host = createPluginHost(openDocument(), plugin([]), 'marks')
  const first = host.call(PLUGIN_POINTER_CALL, {})
  expect(pluginPointerHolder.value).toBe('marks')
  cancelPluginPointer()
  expect(await first).toBeNull()

  const outcome = await pointerRequestOutcome(host.call(PLUGIN_POINTER_CALL, {}))
  expect(outcome).toBeInstanceOf(Error)
  expect(outcome instanceof Error ? outcome.message : '').toBe(PLUGIN_POINTER_CANCELLED_MESSAGE)
  expect(pluginPointerHolder.value).toBeNull()
  host.finish(false)
})

test('a new run of the same plugin may take the pointer after a cancel', async () => {
  const store = openDocument()
  const first = createPluginHost(store, plugin([]), 'marks')
  const cancelled = first.call(PLUGIN_POINTER_CALL, {})
  cancelPluginPointer()
  expect(await cancelled).toBeNull()
  first.finish(false)

  const second = createPluginHost(store, plugin([]), 'marks')
  const next = second.call(PLUGIN_POINTER_CALL, {})
  expect(pluginPointerHolder.value).toBe('marks')
  endPluginPointer()
  expect(await next).toEqual([])
  second.finish(false)
})
