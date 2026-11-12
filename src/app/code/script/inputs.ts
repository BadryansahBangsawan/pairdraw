/**
 * Writes a script node's input values and variable bindings, as undo steps: they live in the
 * document next to the source, so changing a control is an edit like changing the code. A live run
 * follows from the `node:updated` event these writes send, so a caller never runs the script.
 */
import {
  OPEN_PENCIL_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@open-pencil/scene-graph/plugin-data'
import type { ScriptInputValue, ScriptNodeData } from '@open-pencil/scene-graph/script'

import type { ScriptWriteTarget } from '@/app/code/script/create'

const { script: SCRIPT_FIELD } = OPEN_PENCIL_PLUGIN_DATA

function writeScriptData(
  store: ScriptWriteTarget,
  nodeId: string,
  edit: (data: ScriptNodeData) => ScriptNodeData,
  label: string
): void {
  const node = store.graph.getNode(nodeId)
  if (node?.type !== 'SCRIPT') return
  const data = readPluginData(node.pluginData, SCRIPT_FIELD)
  if (!data) return
  store.updateNodeWithUndo(
    nodeId,
    { pluginData: withPluginData(node.pluginData, SCRIPT_FIELD, edit(data)) },
    label
  )
}

/** Sets one input's value; `undefined` drops it, so the input runs at its declared default. */
export function setScriptInput(
  store: ScriptWriteTarget,
  nodeId: string,
  name: string,
  value: ScriptInputValue | undefined
): void {
  writeScriptData(
    store,
    nodeId,
    (data) => {
      const inputs = { ...data.inputs }
      if (value === undefined) delete inputs[name]
      else inputs[name] = value
      return { ...data, inputs }
    },
    'Edit script input'
  )
}

/** Points one input at a variable, or back at its stored value when `variableId` is null. */
export function setScriptBinding(
  store: ScriptWriteTarget,
  nodeId: string,
  name: string,
  variableId: string | null
): void {
  writeScriptData(
    store,
    nodeId,
    (data) => {
      const bindings = { ...data.bindings }
      if (variableId === null) delete bindings[name]
      else bindings[name] = variableId
      return { ...data, bindings }
    },
    'Bind script input'
  )
}