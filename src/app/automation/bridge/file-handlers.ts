import * as v from 'valibot'

import { parseToolArgs } from '@pairdraw/core/tools'

import { agentChatDocument } from '@/app/ai/reply/run'
import { readAgentSession } from '@/app/automation/agents'
import {
  isUnknownRecord,
  markSessionDocumentClosed,
  rememberSessionDocument,
  sessionDocument
} from '@/app/automation/bridge/session-document'
import {
  resolveAutomationTarget,
  responseWithTarget,
  type AutomationTarget
} from '@/app/automation/bridge/target'
import { resolveBrowserFileURL } from '@/app/document/io/browser'
import { openBrowserFileFromURL } from '@/app/shell/menu/files'
import { openFileFromPath } from '@/app/shell/menu/use'
import {
  activeTab,
  closeTab,
  createTab,
  getActiveStore,
  getTabById,
  getTabForStore,
  getTabsSnapshot
} from '@/app/tabs'
import { isTauri } from '@/app/tauri/env'

/** Where a browser app reads and writes the paths the file tools name: the MCP server's `/files/`. */
export interface AutomationFiles {
  url: (path: string) => URL
  headers: Record<string, string>
}

const saveArgsSchema = v.object({ path: v.optional(v.string()) })

const closeArgsSchema = v.object({
  path: v.optional(v.string()),
  unsaved: v.optional(v.picklist(['error', 'save', 'discard']), 'error')
})

export async function ensureTauriParentDirectory(path: string): Promise<void> {
  if (!isTauri()) return
  const [{ dirname }, { mkdir }] = await Promise.all([
    import('@tauri-apps/api/path'),
    import('@tauri-apps/plugin-fs')
  ])
  const dir = await dirname(path)
  if (dir === path) return
  await mkdir(dir, { recursive: true })
}

/**
 * The file commands. `files` is the MCP server a browser app reads and writes paths through;
 * without one, as in-process on the landing page, a browser path is a URL beside the page.
 */
export function createFileHandlers(files?: AutomationFiles) {
  /**
   * A browser cannot write the path, so the MCP server writes a copy there, and the document
   * counts as saved as after a download.
   */
  async function writeThroughServer(
    server: AutomationFiles,
    path: string,
    data: Uint8Array
  ): Promise<void> {
    const response = await fetch(server.url(path), {
      method: 'PUT',
      headers: { ...server.headers, 'content-type': 'application/octet-stream' },
      body: new Uint8Array(data)
    })
    if (!response.ok) throw new Error(`Could not write ${path}: ${await response.text()}`)
  }

  /**
   * The file a browser document was opened from through this MCP server's `/files/` route,
   * which the server can write back; a URL of any other origin is not this server's file.
   */
  function serverOpenedPath(store: AutomationTarget['store']): string | undefined {
    if (!files || isTauri()) return undefined
    const source = store.getDocumentFilePath()
    if (!source) return undefined
    let url: URL
    try {
      url = new URL(source)
    } catch {
      return undefined
    }
    const base = files.url('')
    if (url.origin !== base.origin || !url.pathname.startsWith('/files/')) return undefined
    return url.pathname.slice('/files/'.length).split('/').map(decodeURIComponent).join('/')
  }

  // Automation never opens the Save dialog: nobody may be there to answer it.
  async function saveWithoutPrompt(store: AutomationTarget['store'], path?: string): Promise<void> {
    const name = store.state.documentName
    const openedFrom = path ? undefined : serverOpenedPath(store)
    if (!path && !openedFrom && !store.hasWritableSource()) {
      throw new Error(`"${name}" has not been saved to a file yet; pass a path to save it`)
    }
    if (openedFrom && files) {
      await store.saveFigFileCopy((data) => writeThroughServer(files, openedFrom, data))
      return
    }
    if (path && files && !isTauri()) {
      await store.saveFigFileCopy((data) => writeThroughServer(files, path, data))
      return
    }
    if (path) await ensureTauriParentDirectory(path)
    // A failed save to a new path leaves the document with the source it had.
    const saved = path ? await store.saveFigFileToPath(path) : await store.saveFigFile()
    if (!saved) throw new Error(`Could not save "${name}"`)
  }

  async function handleSaveFile(target: AutomationTarget, args: unknown): Promise<unknown> {
    const { path } = parseToolArgs('save_file', saveArgsSchema, args)
    await saveWithoutPrompt(target.store, path)
    return { ok: true, result: { saved: true } }
  }

  async function handleCloseFile(target: AutomationTarget, args: unknown): Promise<unknown> {
    const { path, unsaved } = parseToolArgs('close_file', closeArgsSchema, args)
    const store = target.store
    if (store.hasUnsavedChanges()) {
      if (unsaved === 'error') {
        throw new Error(
          `"${store.state.documentName}" has unsaved changes. ` +
            'Save or discard them: CLI --save or --discard, MCP unsaved "save" or "discard"'
        )
      }
      if (unsaved === 'save') await saveWithoutPrompt(store, path)
    }
    const session = isUnknownRecord(args) ? readAgentSession(args.agent) : null
    const known = session ? sessionDocument(session.session) : 'none'
    // Automation closes the tab without anyone to answer for its copies, so they stay for Home.
    await closeTab(target.documentId, unsaved === 'discard' ? 'discard' : 'save', {
      keepCopies: true
    })
    if (session && known !== 'none' && known !== 'closed' && known.tab.id === target.documentId) {
      markSessionDocumentClosed(session.session)
    }
    return { ok: true, result: { closed: getTabById(target.documentId) === undefined } }
  }

  async function handleNewDocument(_target: AutomationTarget, args: unknown): Promise<unknown> {
    const { path } = parseToolArgs('new_document', saveArgsSchema, args)
    const session = isUnknownRecord(args) ? readAgentSession(args.agent) : null
    // The app's own chat designing in the document in front shows what its agent opened, so the
    // person watches it being made. A chat that moved away, and every other caller, keep the
    // document in the background.
    const chatDocument = agentChatDocument(session?.chat)
    const behind = chatDocument !== undefined && chatDocument !== activeTab.value?.store
    const tab = createTab(undefined, undefined, behind ? { active: false } : undefined)
    if (path) {
      try {
        await saveWithoutPrompt(tab.store, path)
      } catch (error) {
        await closeTab(tab.id, 'discard')
        throw error
      }
    }
    if (session) rememberSessionDocument(session.session, tab.id, true)
    const target = resolveAutomationTarget(tab.store, { document_id: tab.id })
    return responseWithTarget({ ok: true, result: { created: true } }, target)
  }

  async function handleOpenFile(_target: AutomationTarget, args: unknown): Promise<unknown> {
    if (!isUnknownRecord(args) || typeof args.path !== 'string' || args.path.length === 0) {
      throw new Error('Missing "path" in args')
    }
    const path = args.path
    const before = new Set(getTabsSnapshot().map((tab) => tab.id))
    if (isTauri()) {
      await openFileFromPath(path)
    } else if (files) {
      // The browser cannot read the path, so it fetches it from the MCP server, with the same
      // cap and format check as every other browser open.
      await openBrowserFileFromURL(files.url(path), { headers: files.headers })
    } else {
      await openBrowserFileFromURL(resolveBrowserFileURL(path))
    }
    // A tab that was already open is only brought forward. Owning it would let this session
    // discard the person's changes with an untargeted close.
    const created = getTabsSnapshot().find((tab) => tab.kind === 'document' && !before.has(tab.id))
    const opened = created ?? getTabForStore(getActiveStore())
    const target = resolveAutomationTarget(opened?.store ?? getActiveStore(), undefined)
    const session = readAgentSession(args.agent)
    if (session && created) rememberSessionDocument(session.session, created.id, true)
    return responseWithTarget({ ok: true, result: { opened: true } }, target)
  }

  return { handleSaveFile, handleCloseFile, handleNewDocument, handleOpenFile }
}
