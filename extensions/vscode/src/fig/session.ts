import { fromUint8Array, toUint8Array } from 'js-base64'
import * as v from 'valibot'
import * as vscode from 'vscode'

import { webviewMessageSchema, type WebviewMessage } from '../webview/messages'
import { documentFormat } from './formats'

type SavedMessage = Extract<WebviewMessage, { type: 'saved' }>

interface PendingSave {
  id: number
  resolve: (message: SavedMessage) => void
  reject: (error: Error) => void
}

/**
 * One open editor panel: it loads the document into the webview's editor, turns its edits into
 * one dirty signal per save cycle, and answers the provider's save by asking the editor for the
 * bytes it currently shows. Documents are never parsed here.
 */
export class EditorSession implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = []
  private pendingSave: PendingSave | null = null
  private nextSaveId = 1
  private dirty = false

  constructor(
    private readonly document: vscode.CustomDocument,
    private readonly panel: vscode.WebviewPanel,
    private readonly onEdited: (document: vscode.CustomDocument) => void
  ) {
    this.disposables.push(
      panel.webview.onDidReceiveMessage((raw: unknown) => this.onMessage(raw))
    )
  }

  dispose(): void {
    for (const disposable of this.disposables) disposable.dispose()
    this.pendingSave?.reject(new Error('The editor closed before the save finished'))
    this.pendingSave = null
  }

  /** Brings the editor panel forward; the embed app keeps its own undo history. */
  reveal(): void {
    this.panel.reveal()
  }

  /** Loads the bytes on disk into the editor, replacing whatever it showed. */
  async reload(): Promise<void> {
    const bytes = await vscode.workspace.fs.readFile(this.document.uri)
    this.panel.webview.postMessage({
      type: 'load',
      name: fileName(this.document.uri),
      data: fromUint8Array(bytes)
    })
    this.dirty = false
  }

  /**
   * Asks the editor for the bytes it shows and writes them to `destination`. The editor answers
   * the request, so a save can fail with the editor's message instead of writing stale bytes.
   */
  async save(destination: vscode.Uri = this.document.uri): Promise<void> {
    if (this.pendingSave) throw new Error('A save is already running')
    const id = this.nextSaveId++
    const message = await new Promise<SavedMessage>((resolve, reject) => {
      this.pendingSave = { id, resolve, reject }
      this.panel.webview.postMessage({ type: 'save', id, format: documentFormat(destination.path) })
    })
    await vscode.workspace.fs.writeFile(destination, toUint8Array(message.data))
    this.dirty = false
  }

  private onMessage(raw: unknown): void {
    const parsed = v.safeParse(webviewMessageSchema, raw)
    if (!parsed.success) return
    const message = parsed.output
    if (message.type === 'connected') {
      void this.reload()
      return
    }
    if (message.type === 'documentchange') {
      if (this.dirty) return
      this.dirty = true
      this.onEdited(this.document)
      return
    }
    if (message.type === 'saved') {
      const pending = this.pendingSave
      if (!pending || pending.id !== message.id) return
      this.pendingSave = null
      pending.resolve(message)
      return
    }
    if (message.type === 'error') {
      const pending = this.pendingSave
      this.pendingSave = null
      pending?.reject(new Error(message.message))
      void vscode.window.showErrorMessage(`Pairdraw: ${message.message}`)
    }
  }
}

/** The file's own name, which the editor keeps as the document title. */
export function fileName(uri: vscode.Uri): string {
  return uri.path.slice(uri.path.lastIndexOf('/') + 1) || uri.path
}