/**
 * Places a SCRIPT node in the middle of the view and runs its starter program, so a new code
 * layer draws something at once. The node is one undo step, as any other created layer is.
 */
import {
  OPEN_PENCIL_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@open-pencil/scene-graph/plugin-data'
import { SCRIPT_MAX_SOURCE_LENGTH, type ScriptNodeData } from '@open-pencil/scene-graph/script'

import { runScriptNode } from '@/app/code/script/run-node'
import type { EditorStore } from '@/app/editor/session'
/** What writing script data needs of an editor: the document and an undoable node write. */
export type ScriptWriteTarget = Pick<EditorStore, 'graph' | 'updateNodeWithUndo'>

const { script: SCRIPT_FIELD } = OPEN_PENCIL_PLUGIN_DATA

/** The size a new script node takes, as a small artboard of its own. */
const SCRIPT_WIDTH = 320
const SCRIPT_HEIGHT = 200

/**
 * The program a new script node starts with: five bars drawn with the `pencil` global. It stays
 * inside the sandbox's layer kinds, so it draws the moment the node is placed.
 */
export const SCRIPT_STARTER_SOURCE = `const bars = [24, 40, 32, 48, 36]

return pencil.frame({ name: 'Chart', width: 320, height: 200 }, [
  pencil.rect({ name: 'Background', width: 320, height: 200, radius: 12, fill: '#ffffff' }),
  ...bars.map((bar, index) =>
    pencil.rect({
      name: \`Bar \${index + 1}\`,
      x: 24 + index * 56,
      y: 176 - bar * 3,
      width: 40,
      height: bar * 3,
      radius: 6,
      fill: '#5b73f2'
    })
  )
])`

/** The script data a node holds, kept while only its source changes. */
function nextScriptData(
  store: ScriptWriteTarget,
  nodeId: string,
  source: string
): ScriptNodeData | undefined {
  const text = source.slice(0, SCRIPT_MAX_SOURCE_LENGTH)
  if (text.trim() === '') return undefined
  const data = readPluginData(store.graph.getNode(nodeId)?.pluginData, SCRIPT_FIELD)
  return { ...data, version: 1, source: text }
}

/**
 * Writes a script node's source, as an undo step: the source lives in the document, so editing it
 * is an edit like any other. Clearing it removes the program, which draws nothing.
 */
export function setScriptSource(store: ScriptWriteTarget, nodeId: string, source: string): void {
  const node = store.graph.getNode(nodeId)
  if (node?.type !== 'SCRIPT') return
  store.updateNodeWithUndo(
    nodeId,
    {
      pluginData: withPluginData(
        node.pluginData,
        SCRIPT_FIELD,
        nextScriptData(store, nodeId, source)
      )
    },
    'Edit script'
  )
}

/** Places a script node in the middle of the view, writes its program, and runs it there. */
export function insertScriptNode(store: EditorStore, source = SCRIPT_STARTER_SOURCE): string {
  const { width, height } = store.getViewportSize()
  const x = (width / 2 - store.state.panX) / store.state.zoom - SCRIPT_WIDTH / 2
  const y = (height / 2 - store.state.panY) / store.state.zoom - SCRIPT_HEIGHT / 2
  const id = store.createShape('SCRIPT', Math.round(x), Math.round(y), SCRIPT_WIDTH, SCRIPT_HEIGHT)
  setScriptSource(store, id, source)
  store.select([id])
  void runScriptNode(store.graph, id, store.state.currentPageId)
  return id
}
