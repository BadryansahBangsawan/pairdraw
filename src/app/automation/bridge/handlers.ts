import { omit } from 'es-toolkit'

import type { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS, isToolExposed, parseToolArgs, toolChangesDocument } from '@pairdraw/core/tools'

import { agentSessionOpened, endAgentSession, readAgentSession } from '@/app/automation/agents'
import {
  handleActivateDocument,
  handleGetSettings,
  handleListRecentFiles,
  handleRedo,
  handleUndo,
  handleUpdateSettings
} from '@/app/automation/bridge/app-handlers'
import { handleBrowserSnapshot } from '@/app/automation/bridge/browser-snapshot'
import { createAutomationEvalHandler } from '@/app/automation/bridge/eval-handler'
import { handleExport, handleExportJSX } from '@/app/automation/bridge/export-handlers'
import { createFileHandlers, type AutomationFiles } from '@/app/automation/bridge/file-handlers'
import { prepareAutomationRendering } from '@/app/automation/bridge/render-kit'
import { handleRPCFallback } from '@/app/automation/bridge/rpc-handler'
import { handleSelection } from '@/app/automation/bridge/selection-handler'
import {
  callNamesNode,
  isUnknownRecord,
  rememberSessionDocument,
  type UnknownRecord
} from '@/app/automation/bridge/session-document'
import {
  listAutomationDocuments,
  resolveAutomationTarget,
  responseWithTarget,
  stripAutomationTargetArgs,
  type AutomationTarget
} from '@/app/automation/bridge/target'
import { createAutomationToolHandler } from '@/app/automation/bridge/tool-handlers'
import { browserState } from '@/app/browser/state'
import {
  browserToolCall,
  isBrowserToolCommand,
  runBrowserTool,
  type BrowserToolActions
} from '@/app/browser/tools'
import {
  captureBrowserElement,
  navigateBrowserWindow,
  readBrowserElement,
  readBrowserOutline,
  screenshotBrowser
} from '@/app/browser/window'
import type { EditorStore } from '@/app/editor/active-store'
import { closeTab } from '@/app/tabs'
import { IS_TAURI } from '@/constants'

type FigmaFactory = (store: EditorStore, pageId?: string) => FigmaAPI

type CommandHandler = (
  target: AutomationTarget,
  args: unknown,
  signal?: AbortSignal
) => Promise<unknown>

function exposedTool(name: string) {
  return ALL_TOOLS.find((tool) => tool.name === name && isToolExposed(tool, 'mcp'))
}

/** A script or eval. It opens a document only when running it actually changes one. */
function changesOnlyIfApplied(command: string, args: UnknownRecord): boolean {
  if (command === 'eval') return true
  return command === 'tool' && (args.name === 'eval' || args.name === 'script')
}

/** A call that changes the document. A view change, undo, a read, and a script open nothing yet. */
function commandEditsDocument(command: string, args: UnknownRecord): boolean {
  if (command !== 'tool') return false
  const name = args.name
  if (typeof name !== 'string' || changesOnlyIfApplied(command, args)) return false
  const def = exposedTool(name)
  return def ? toolChangesDocument(def) : false
}

/** close_file needs a document this session opened. save_file may use the one it is targeting. */
function documentAction(command: string): 'close' | 'save' | undefined {
  if (command === 'close_file') return 'close'
  if (command === 'save_file') return 'save'
  return undefined
}

/** One session for every caller that never introduces itself, so its commands share a document. */
function attachCaller(args: unknown): UnknownRecord {
  const raw = isUnknownRecord(args) ? { ...args } : {}
  if (!readAgentSession(raw.agent)) raw.agent = { session: 'anonymous', kind: 'mcp' }
  return raw
}

function callerOf(args: UnknownRecord): { sessionId: string | undefined; cliFacing: boolean } {
  const session = readAgentSession(args.agent)
  return { sessionId: session?.session, cliFacing: session?.client === 'CLI' }
}

function callFailed(result: unknown): boolean {
  return isUnknownRecord(result) && result.ok === false
}

/** A tab opened for this call and then closed is not a document the caller can use. */
function withoutClosedTarget(result: unknown): unknown {
  if (!isUnknownRecord(result)) return result
  return omit(result, ['target'])
}

/** Refuses a tool call whose arguments cannot run, before any document is opened for it. */
function rejectInvalidToolArgs(command: string, args: UnknownRecord): void {
  if (command !== 'tool' || typeof args.name !== 'string') return
  const def = exposedTool(args.name)
  if (!def) return
  const toolArgs = isUnknownRecord(args.args) ? args.args : {}
  parseToolArgs(def.name, def.input, toolArgs)
}

export function createAutomationCommandHandlers(makeFigma: FigmaFactory, files?: AutomationFiles) {
  const handleEval = createAutomationEvalHandler(makeFigma)
  const handleTool = createAutomationToolHandler(makeFigma)
  const { handleSaveFile, handleCloseFile, handleNewDocument, handleOpenFile } =
    createFileHandlers(files)
  const browserActions: BrowserToolActions = {
    navigate: navigateBrowserWindow,
    screenshot: screenshotBrowser,
    captureElement: captureBrowserElement,
    readElement: readBrowserElement,
    readOutline: readBrowserOutline
  }

  const commandHandlers: Partial<Record<string, CommandHandler>> = {
    eval: handleEval,
    tool: handleTool,
    export: handleExport,
    export_jsx: handleExportJSX,
    selection: handleSelection,
    save_file: handleSaveFile,
    close_file: handleCloseFile,
    new_document: handleNewDocument,
    open_file: handleOpenFile,
    activate_document: handleActivateDocument,
    undo: handleUndo,
    redo: handleRedo
  }

  /** Runs a command on a resolved document page, loading the page first if it was never shown. */
  async function handleTargetCommand(
    target: AutomationTarget,
    command: string,
    args: UnknownRecord,
    signal?: AbortSignal
  ): Promise<unknown> {
    if (!(await target.store.preparePageNodes(target.pageId))) {
      throw new Error(`Page "${target.pageId}" was closed before it finished loading`)
    }
    // A document that is not on screen renders through the export renderer; load it before the
    // command, so the Figma API built for it can decode what it exports.
    await prepareAutomationRendering(target.store)
    const handler = commandHandlers[command]
    const result = handler
      ? await handler(target, args, signal)
      : await handleRPCFallback(target, command, args)
    return responseWithTarget(result, target)
  }

  async function handleRequest(
    store: EditorStore,
    command: string,
    args: unknown,
    signal?: AbortSignal
  ): Promise<unknown> {
    const callerArgs = attachCaller(args)
    if (command === 'list_documents') {
      return { ok: true, result: { documents: listAutomationDocuments(store) } }
    }
    if (command === 'list_recent_files') return handleListRecentFiles()
    if (command === 'agent_session_opened') {
      agentSessionOpened(callerArgs)
      return { ok: true, result: null }
    }
    if (command === 'agent_session_closed') {
      const session = callerArgs.session
      if (typeof session === 'string') endAgentSession(session)
      return { ok: true, result: null }
    }
    if (command === 'get_settings') return handleGetSettings()
    if (command === 'update_settings') return handleUpdateSettings(callerArgs)

    // A snapshot is a layer in the open document. A browser tab is refused before the window.
    if (command === 'browser_snapshot') return handleBrowserSnapshot(store, callerArgs, IS_TAURI)

    if (isBrowserToolCommand(command)) {
      const decided = browserToolCall(command, callerArgs, IS_TAURI, browserState.open)
      if (!decided.ok) throw new Error(decided.error)
      const call = decided.call
      if (call.command === 'browser_element' || call.command === 'browser_screenshot_to_canvas') {
        return finishTargeted(
          store,
          callerArgs,
          { edit: true, namesNode: callNamesNode(command, callerArgs) },
          async (target) => {
            const result = await runBrowserTool(target.store, call, browserActions)
            return responseWithTarget({ ok: true, result }, target)
          }
        )
      }
      return { ok: true, result: await runBrowserTool(store, call, browserActions) }
    }

    if (command === 'open_file' || command === 'new_document') {
      const handler = commandHandlers[command]
      if (handler) return handler(resolveAutomationTarget(store, undefined), callerArgs)
    }

    rejectInvalidToolArgs(command, callerArgs)
    const provisional = changesOnlyIfApplied(command, callerArgs)
    return finishTargeted(
      store,
      callerArgs,
      {
        edit: provisional || commandEditsDocument(command, callerArgs),
        documentCommand: documentAction(command),
        keepIfChanged: provisional,
        namesNode: callNamesNode(command, callerArgs)
      },
      (target) => {
        // A graph command such as `tree` reads the page it was asked for from its own arguments.
        const commandArgs = commandHandlers[command]
          ? stripAutomationTargetArgs(callerArgs)
          : omit(callerArgs, ['document_id'])
        return handleTargetCommand(target, command, commandArgs, signal)
      }
    )
  }

  /**
   * Resolves the session's document, runs the call, and drops a tab this call opened when the
   * call fails or a script leaves the document unchanged.
   */
  async function finishTargeted(
    store: EditorStore,
    rawArgs: UnknownRecord,
    options: {
      edit: boolean
      documentCommand?: 'close' | 'save'
      keepIfChanged?: boolean
      namesNode?: boolean
    },
    run: (target: AutomationTarget) => Promise<unknown>
  ): Promise<unknown> {
    const caller = callerOf(rawArgs)
    const sessionId = caller.sessionId
    const target = resolveAutomationTarget(store, rawArgs, {
      edit: options.edit,
      sessionId,
      documentCommand: options.documentCommand,
      namesNode: options.namesNode,
      cliFacing: caller.cliFacing
    })
    // A render bumps sceneVersion even when the script changed nothing. An undo step is recorded
    // only for a real edit, so that is what decides whether a provisional tab stays.
    const history = target.store.undo.peekUndo()
    try {
      const result = await run(target)
      const unchanged = options.keepIfChanged === true && target.store.undo.peekUndo() === history
      if (target.openedForCall && (callFailed(result) || unchanged)) {
        await closeTab(target.documentId, 'discard')
        return withoutClosedTarget(result)
      }
      if (sessionId && options.edit && !callFailed(result)) {
        rememberSessionDocument(sessionId, target.documentId, target.openedForCall === true)
      }
      return result
    } catch (error) {
      if (target.openedForCall) await closeTab(target.documentId, 'discard')
      throw error
    }
  }

  return { handleRequest, handleTargetCommand }
}
