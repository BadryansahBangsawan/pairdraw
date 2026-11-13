/**
 * The host side of a plugin's tool calls: the only way a plugin reaches the document. Every call
 * is a tool the app already has, its capability is checked against the plugin's grants, and every
 * write the run makes lands in one undo step.
 */
import { uniq } from 'es-toolkit'

import { ALL_TOOLS, toolFailure, type ToolDef } from '@open-pencil/core/tools'

import * as figmaFactory from '@/app/automation/bridge/figma-factory'
import type { EditorStore } from '@/app/editor/session/create'

import { authorizePluginCall } from '../grants'
import { pluginCallDeniedMessage, pluginCallUnknownMessage } from '../messages'
import type { InstalledPlugin } from '../schema'

export const PLUGIN_ASYNC_TOOL_MESSAGE = 'Plugins cannot call a tool that runs asynchronously.'

/** What a plugin's `plugin.call` reaches: the tool it named, or why the host refused. */
export type PluginHostCall = (name: string, args: unknown) => Promise<unknown>

export interface PluginHost {
  call: PluginHostCall
  /** Ends the run: commits what it changed as one step, or puts all of it back when it failed. */
  finish(failed: boolean): void
}

function refusal(error: unknown): never {
  throw error instanceof Error ? error : new Error(String(error))
}

/**
 * Opens one plugin run against the document: a plugin's reads answer at once, its writes join a
 * single undo step closed by `finish`, and a call it was not granted fails without editing.
 */
export function createPluginHost(
  store: EditorStore,
  plugins: readonly InstalledPlugin[],
  id: string
): PluginHost {
  const figma = figmaFactory.makeFigmaFromStore(store)
  store.undo.beginBatch(`Plugin: ${id}`)

  async function call(name: string, args: unknown): Promise<unknown> {
    const def = ALL_TOOLS.find((tool) => tool.name === name)
    if (!def) refusal(new Error(pluginCallUnknownMessage(name)))
    for (const capability of uniq(def.capabilities)) {
      if (authorizePluginCall(plugins, id, capability) !== 'allowed') {
        refusal(new Error(pluginCallDeniedMessage(capability)))
      }
    }
    try {
      return await perform(def, args)
    } catch (error) {
      return refusal(toolFailure(error).error)
    }
  }

  async function perform(def: ToolDef, args: unknown): Promise<unknown> {
    const values =
      typeof args === 'object' && args !== null ? Object.fromEntries(Object.entries(args)) : {}
    if (!def.mutates) return def.execute(figma, values)
    if (def.execution.kind !== 'sync') refusal(new Error(PLUGIN_ASYNC_TOOL_MESSAGE))
    await def.loadFonts(figma, values)
    const pageId = store.state.currentPageId
    return store.recordEdit({ label: `Plugin: ${def.name}`, pageId }, () =>
      store.runMutationWithLayout(() => def.execute(figma, values), pageId)
    )
  }

  return {
    call,
    finish(failed) {
      if (failed) store.undo.rollbackBatch()
      else store.undo.commitBatch()
      store.requestRender()
    }
  }
}
