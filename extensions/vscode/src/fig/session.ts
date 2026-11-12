import { fromUint8Array, isValid, toUint8Array } from 'js-base64'
import * as v from 'valibot'
import type * as vscode from 'vscode'

import type { EmbedImageFormat } from '../embed/protocol'
import type { ExtensionHost } from '../host'
import { webviewMessageSchema, type WebviewMessage } from '../webview/messages'
import { documentFormat } from './formats'

type SavedMessage = Extract<WebviewMessage, { type: 'saved' }>
type ExportedMessage = Extract<WebviewMessage, { type: 'exported' }>

interface PendingRequest<T> {
  id: number
  resolve: (message: T) => void
  reject: (error: Error) => void
}

interface ExportOptions {
  format?: EmbedImageFormat
  scale?: number
}

/**
 * One open editor panel: it loads the document into the webview's editor, turns its edits into
 * one dirty signal per save cycle, and answers the provider's save by asking the editor for the
 * bytes it currently shows. Documents are never parsed here.
 */
export class EditorSession implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = []
  private pendingSave: PendingRequest<SavedMessage> | null = null
  private pendingExport: PendingRequest<ExportedMessage> | null = null
  private nextRequestId = 1
  private dirty = false

  constructor(
    private readonly host: ExtensionHost,
    private readonly document: vscode.CustomDocument,
    private readonly panel: vscode.WebviewPanel,
    private readonly onEdited: (document: vscode.CustomDocument) => void
  ) {
    this.disposables.push(panel.webview.onDidReceiveMessage((raw: unknown) => this.onMessage(raw)))
  }

  dispose(): void {
    for (const disposable of this.disposables) disposable.dispose()
    this.pendingSave?.reject(new Error('The editor closed before the save finished'))
    this.pendingSave = null
    this.pendingExport?.reject(new Error('The editor closed before the export finished'))
    this.pendingExport = null
  }

  /** Brings the editor panel forward; the embed app keeps its own undo history. */
  reveal(): void {
    this.panel.reveal()
  }

  /** Loads the bytes on disk into the editor, replacing whatever it showed. */
  async reload(): Promise<void> {
    const bytes = await this.host.readFile(this.document.uri)
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
    const id = this.nextRequestId++
    const message = await new Promise<SavedMessage>((resolve, reject) => {
      this.pendingSave = { id, resolve, reject }
      this.panel.webview.postMessage({ type: 'save', id, format: documentFormat(destination.path) })
    })
    await this.host.writeFile(destination, bytesFromEditor(message.data))
    this.dirty = false
  }

  /**
   * Asks the editor for its current selection as an image. The editor writes the bytes, so the
   * extension never parses a document to export it.
   */
  async exportSelection(
    options: ExportOptions = {}
  ): Promise<{ data: Uint8Array; mimeType: string }> {
    if (this.pendingExport) throw new Error('An export is already running')
    const id = this.nextRequestId++
    const message = await new Promise<ExportedMessage>((resolve, reject) => {
      this.pendingExport = { id, resolve, reject }
      this.panel.webview.postMessage({ type: 'export', id, ...options })
    })
    this.pendingExport = null
    return { data: bytesFromEditor(message.data), mimeType: message.mimeType }
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
    if (message.type === 'exported') {
      const pending = this.pendingExport
      if (!pending || pending.id !== message.id) return
      this.pendingExport = null
      pending.resolve(message)
      return
    }
    if (message.type === 'error') {
      const pendingSave = this.pendingSave
      const pendingExport = this.pendingExport
      this.pendingSave = null
      this.pendingExport = null
      pendingSave?.reject(new Error(message.message))
      pendingExport?.reject(new Error(message.message))
      this.host.showError(`Pairdraw: ${message.message}`)
    }
  }
}

/** Bytes the editor claimed to return. Invalid base64 decodes as empty and would wipe the file. */
function bytesFromEditor(data: string): Uint8Array {
  if (!isValid(data)) throw new Error('The editor returned data that is not base64')
  return toUint8Array(data)
}

/** The file's own name, which the editor keeps as the document title. */
export function fileName(uri: vscode.Uri): string {
  return uri.path.slice(uri.path.lastIndexOf('/') + 1) || uri.path
}
