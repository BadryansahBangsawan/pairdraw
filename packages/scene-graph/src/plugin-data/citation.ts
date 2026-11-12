import * as v from 'valibot'

import type { SceneNode } from '../types'
import { readPluginData, withPluginData } from './field'
import { OPEN_PENCIL_PLUGIN_DATA } from './fields'
import { webCitationSchema, type WebCitation } from './schema'

export { CITATION_QUOTE_LIMIT, type WebCitation } from './schema'

/** The citation stored on a node, or null when it has none or the record cannot be read. */
export function readWebCitation(node: Pick<SceneNode, 'pluginData'>): WebCitation | null {
  return readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.webCitation) ?? null
}

/**
 * Plugin data with `citation` stored on the node. An invalid record is left unwritten, so a bad
 * value never replaces a citation the node already has.
 */
export function withWebCitation(
  node: Pick<SceneNode, 'pluginData'>,
  citation: WebCitation | null
): SceneNode['pluginData'] | null {
  if (!citation)
    return withPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.webCitation, undefined)
  const parsed = v.safeParse(webCitationSchema, citation)
  if (!parsed.success) return null
  return withPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.webCitation, parsed.output)
}
