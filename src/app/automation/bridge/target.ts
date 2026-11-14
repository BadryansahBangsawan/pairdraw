import type { AutomationDocumentSummary } from '@pairdraw/core/rpc'

import type { EditorStore } from '@/app/editor/active-store'
import { getTabById, getTabForStore, getTabsSnapshot } from '@/app/tabs'
import { localDocumentId, windowDocumentId } from '@/app/window/identity'
import { APP_NAME } from '@/constants'

export type UnknownRecord = { [key: string]: unknown }

export type AutomationTargetArgs = {
  document_id?: unknown
  page_id?: unknown
}

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export type AutomationTarget = {
  store: EditorStore
  documentId: string
  documentName: string
  path?: string
  pageId: string
  pageName: string
}

export type AutomationTargetResult = Omit<AutomationTarget, 'store'>

export function stripAutomationTargetArgs(args: UnknownRecord): UnknownRecord {
  const { document_id: _documentId, page_id: _pageId, ...rest } = args
  return rest
}

export function targetToResult(target: AutomationTarget): AutomationTargetResult {
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
  const targetResult = targetToResult(target)
  if (isUnknownRecord(body)) {
    return { ...body, target: targetResult }
  }
  return { ok: true, result: body, target: targetResult }
}

export function listAutomationDocuments(activeStore: EditorStore): AutomationDocumentSummary[] {
  const activeTab = getTabForStore(activeStore)
  return getTabsSnapshot().map((tab) => {
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

export function resolveAutomationTarget(
  activeStore: EditorStore,
  args: AutomationTargetArgs | undefined
): AutomationTarget {
  const requestedDocumentId = readString(args?.document_id)
  // An id from outside may name another window; that window's document is not ours to answer for.
  const localId = requestedDocumentId ? localDocumentId(requestedDocumentId) : null
  if (requestedDocumentId && !localId) {
    throw new Error(`Document "${requestedDocumentId}" is not open in this window`)
  }
  const tab = localId ? getTabById(localId) : getTabForStore(activeStore)
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
  return {
    store: tab.store,
    documentId: tab.id,
    documentName: tab.store.state.documentName,
    ...(path ? { path } : {}),
    pageId,
    pageName: page.name
  }
}
