import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core/figma-api'

import * as figmaFactory from '@/app/automation/bridge/figma-factory'
import { createEditorStore } from '@/app/editor/session/create'
import { installPlugin, setPluginEnabled } from '@/app/plugins/catalog'
import { grantPlugin } from '@/app/plugins/grants'
import { createPluginHost } from '@/app/plugins/sandbox/host'
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
