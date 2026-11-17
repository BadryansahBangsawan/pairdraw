import type { AutomationDocumentSummary } from '@pairdraw/core/rpc'

import {
  AutomationDocumentError,
  isUnknownRecord,
  sessionDocument,
  type UnknownRecord
} from '@/app/automation/bridge/session-document'
import { documentTabForUntargetedEdit } from '@/app/automation/bridge/untargeted-document'
import type { EditorStore } from '@/app/editor/active-store'
import { getTabById, getTabForStore, getTabsSnapshot, type Tab } from '@/app/tabs'
import { localDocumentId, windowDocumentId } from '@/app/window/identity'
import { APP_NAME } from '@/constants'

export type AutomationTargetArgs = {
  document_id?: unknown
  page_id?: unknown
}

export type AutomationTarget = {
  store: EditorStore
  documentId: string
  documentName: string
  path?: string
  pageId: string
  pageName: string
  /** This call opened the tab. A failure drops it, so a refused call leaves no document behind. */
  openedForCall?: boolean
}

type AutomationTargetResult = Omit<AutomationTarget, 'store'>

export function stripAutomationTargetArgs(args: UnknownRecord): UnknownRecord {
  const { document_id: _documentId, page_id: _pageId, ...rest } = args
  return rest
}

function targetToResult(target: AutomationTarget): AutomationTargetResult {
  return {
    // Replies leave the realm, so the id they carry names its window.
    documentId: windowDocumentId(target.documentId),
    documentName: target.documentName,
    ...(target.path ? { path: target.path } : {}),
    pageId: target.pageId,
    pageName: target.pageName
  }
}

export function responseWithTarget(
  body: unknown,
  target: AutomationTarget
): Record<string, unknown> {
  // Home and a New file tab are not documents. A read that stayed there names no target.
  const tab = getTabById(target.documentId)
  if (tab?.kind !== 'document') {
    return isUnknownRecord(body) ? { ...body } : { ok: true, result: body }
  }
  const targetResult = targetToResult(target)
  if (isUnknownRecord(body)) {
    return { ...body, target: targetResult }
  }
  return { ok: true, result: body, target: targetResult }
}

export function listAutomationDocuments(activeStore: EditorStore): AutomationDocumentSummary[] {
  const activeTab = getTabForStore(activeStore)
  // Home and New file are not documents an agent can edit, so they are not offered as one.
  return getTabsSnapshot()
    .filter((tab) => tab.kind === 'document')
    .map((tab) => {
      const pages = tab.store.graph.getPages().map((page) => ({ id: page.id, name: page.name }))
      const currentPage = tab.store.graph.getNode(tab.store.state.currentPageId)
      const path = tab.store.getDocumentFilePath()
      return {
        id: windowDocumentId(tab.id),
        name: tab.store.state.documentName,
        ...(path ? { path } : {}),
        active: tab.id === activeTab?.id,
        current_page_id: tab.store.state.currentPageId,
        current_page_name: currentPage?.name ?? '',
        pages
      }
    })
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export type ResolveTargetOptions = {
  /** A call that changes the document. From Home, a session with none yet opens one. */
  edit?: boolean
  /** The MCP session this call came from. Absent calls stay on the active tab. */
  sessionId?: string
  /** close_file may use only a document this session opened. save_file may use the one it targets. */
  documentCommand?: 'close' | 'save'
  /** The call names a layer. A brand new document cannot contain it. */
  namesNode?: boolean
  /** A CLI command names the flag `--document-id`. MCP names the field `document_id`. */
  cliFacing?: boolean
}

function refuseUnwritable(tab: Tab): void {
  if (tab.kind === 'document') return
  throw new AutomationDocumentError(
    'not-writable',
    `"${tab.store.state.documentName}" is not a document an agent can change. Open a document first.`
  )
}

export function resolveAutomationTarget(
  activeStore: EditorStore,
  args: AutomationTargetArgs | undefined,
  options?: ResolveTargetOptions
): AutomationTarget {
  const requestedDocumentId = readString(args?.document_id)
  // An id from outside may name another window; that window's document is not ours to answer for.
  const localId = requestedDocumentId ? localDocumentId(requestedDocumentId) : null
  if (requestedDocumentId && !localId) {
    throw new Error(`Document "${requestedDocumentId}" is not open in this window`)
  }
  const resolved = localId
    ? explicitTab(localId, requestedDocumentId, options)
    : untargetedTab(activeStore, options)
  const tab = resolved.tab
  const openedForCall = resolved.opened
  if (!tab) {
    throw new Error(
      requestedDocumentId
        ? `Document "${requestedDocumentId}" not found`
        : `No active ${APP_NAME} document`
    )
  }

  const requestedPageId = readString(args?.page_id)
  const pageId = requestedPageId ?? tab.store.state.currentPageId
  const page = tab.store.graph.getNode(pageId)
  if (page?.type !== 'CANVAS') {
    throw new Error(`Page "${pageId}" not found in document "${tab.id}"`)
  }

  const path = tab.store.getDocumentFilePath()
  const target: AutomationTarget = {
    store: tab.store,
    documentId: tab.id,
    documentName: tab.store.state.documentName,
    pageId,
    pageName: page.name
  }
  if (path) target.path = path
  if (openedForCall) target.openedForCall = true
  return target
}

function explicitTab(
  localId: string,
  requestedDocumentId: string | undefined,
  options: ResolveTargetOptions | undefined
): { tab: Tab; opened: boolean } {
  const tab = getTabById(localId)
  if (!tab) throw new Error(`Document "${requestedDocumentId}" not found`)
  if (options?.edit || options?.documentCommand) refuseUnwritable(tab)
  return { tab, opened: false }
}

function documentIdName(cliFacing: boolean | undefined): string {
  return cliFacing ? '--document-id' : 'document_id'
}

function untargetedTab(
  activeStore: EditorStore,
  options: ResolveTargetOptions | undefined
): { tab: Tab | undefined; opened: boolean } {
  const front = getTabForStore(activeStore)
  const sessionId = options?.sessionId
  const known = sessionId ? sessionDocument(sessionId) : 'none'
  const action = options?.documentCommand
  const idName = documentIdName(options?.cliFacing)
  if (known === 'closed') {
    throw new AutomationDocumentError(
      'closed',
      `The document this session was editing was closed. Call list_documents and pass its ${idName}, or call new_document or open_file.`
    )
  }
  if (known !== 'none') {
    // Saving the document this session is already editing loses nothing. Closing it does.
    if (action === 'close' && !known.owns) {
      throw new AutomationDocumentError(
        'not-owned',
        `This session did not open that document. Pass its ${idName} to close it.`
      )
    }
    return { tab: known.tab, opened: false }
  }
  if (action === 'close') {
    throw new AutomationDocumentError(
      'not-owned',
      `This session has no document to close. Pass a ${idName}, or edit one first.`
    )
  }
  if (action === 'save') {
    if (front?.kind === 'document') return { tab: front, opened: false }
    throw new AutomationDocumentError(
      'not-owned',
      `This session has no document to save. Pass a ${idName}, or edit one first.`
    )
  }
  // Home and a New file are not documents. An edit with none chosen yet opens one.
  if (front && front.kind !== 'document' && options?.edit) {
    if (options.namesNode) {
      throw new Error('That layer is not in a document this session has open.')
    }
    return { tab: documentTabForUntargetedEdit(), opened: true }
  }
  return { tab: front, opened: false }
}
