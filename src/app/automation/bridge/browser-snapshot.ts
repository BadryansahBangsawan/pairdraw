import {
  isUnknownRecord,
  resolveAutomationTarget,
  responseWithTarget
} from '@/app/automation/bridge/target'
import { createBrowserNode, refreshBrowserNode } from '@/app/browser/node/command'
import { BROWSER_DESKTOP_ONLY } from '@/app/browser/tools'
import type { EditorStore } from '@/app/editor/active-store'
import { IS_TAURI } from '@/constants'

/**
 * Creates or refreshes a page snapshot. Outside the desktop app this throws before the window.
 * A closed window is left closed: refresh does not open it.
 */
export async function handleBrowserSnapshot(store: EditorStore, args: unknown): Promise<unknown> {
  if (!IS_TAURI) throw new Error(BROWSER_DESKTOP_ONLY)
  const raw = isUnknownRecord(args) ? args : {}
  const target = resolveAutomationTarget(store, raw)
  const id = layerId(raw.id)
  const outcome = id
    ? await refreshBrowserNode(target.store, id)
    : await createBrowserNode(target.store)
  if (!outcome.ok) throw new Error(outcome.error)
  return responseWithTarget({ ok: true, result: { id: outcome.id } }, target)
}

function layerId(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}
