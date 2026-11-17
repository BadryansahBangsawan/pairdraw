import { readAgentSession } from '@/app/automation/agents'
import {
  callNamesNode,
  rememberSessionDocument,
  type UnknownRecord
} from '@/app/automation/bridge/session-document'
import { resolveAutomationTarget, responseWithTarget } from '@/app/automation/bridge/target'
import { createBrowserNode, refreshBrowserNode } from '@/app/browser/node/command'
import {
  BROWSER_NODE_FAILURE,
  browserNodeFailureEnglish,
  browserNodeFailureHeading
} from '@/app/browser/node/failure'
import { browserState } from '@/app/browser/state'
import { BROWSER_DESKTOP_ONLY } from '@/app/browser/tools'
import type { EditorStore } from '@/app/editor/active-store'
import { closeTab } from '@/app/tabs'

/**
 * Creates or refreshes a page snapshot. Outside the desktop app this throws before the window.
 * A closed window is left closed: refresh does not open it.
 */
export async function handleBrowserSnapshot(
  store: EditorStore,
  args: UnknownRecord,
  desktop: boolean
): Promise<unknown> {
  if (!desktop) throw new Error(BROWSER_DESKTOP_ONLY)
  // A closed window cannot take a picture. Refuse before a document tab is opened for the call.
  if (!browserState.open) {
    throw new Error(
      browserNodeFailureHeading(BROWSER_NODE_FAILURE.windowClosed, browserNodeFailureEnglish)
    )
  }
  const sessionId = readAgentSession(args.agent)?.session
  const target = resolveAutomationTarget(store, args, {
    edit: true,
    sessionId,
    namesNode: callNamesNode('browser_snapshot', args)
  })
  try {
    const id = layerId(args.id)
    const outcome = id
      ? await refreshBrowserNode(target.store, id)
      : await createBrowserNode(target.store)
    if (!outcome.ok) {
      throw new Error(browserNodeFailureHeading(outcome.error, browserNodeFailureEnglish))
    }
    if (sessionId)
      rememberSessionDocument(sessionId, target.documentId, target.openedForCall === true)
    return responseWithTarget({ ok: true, result: { id: outcome.id } }, target)
  } catch (error) {
    if (target.openedForCall) await closeTab(target.documentId, 'discard')
    throw error
  }
}

function layerId(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}
