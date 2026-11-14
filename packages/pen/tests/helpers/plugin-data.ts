import * as v from 'valibot'

import { PEN_PLUGIN_DATA_NAMESPACE } from '@pairdraw/pen'
import type { SceneNode } from '@pairdraw/scene-graph'

const storedSchema = v.pipe(v.string(), v.parseJson())

/** The pen.dev field `key` a layer keeps as shared plugin data, read back from its JSON. */
export function penPluginData(node: SceneNode, key: string): unknown {
  const entries = node.pluginData.filter(
    (item) =>
      item.pluginId === PEN_PLUGIN_DATA_NAMESPACE &&
      item.key === `${PEN_PLUGIN_DATA_NAMESPACE}/${key}`
  )
  if (entries.length > 1) throw new Error(`${node.id} keeps ${key} more than once`)
  const entry = entries.at(0)
  return entry ? v.parse(storedSchema, entry.value) : undefined
}
