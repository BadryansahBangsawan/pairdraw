import { randomBytes } from 'node:crypto'

import * as vscode from 'vscode'

import type { ExtensionHost } from '../host'
import { vscodeHost } from '../vscode-host'
import { embedWebviewHTML, parseEditorURL, DEFAULT_EDITOR_URL } from '../webview/html'
import { EditorSession } from './session'

export interface FigDocument extends vscode.CustomDocument {
  readonly uri: vscode.Uri
}

/**
 * The `.fig` custom editor: the visual editor runs in a webview iframe, so the extension only
 * moves bytes between the workspace and the embed, and reports edits so VS Code saves on its own
 * save command.
 */
export class FigEditorProvider implements vscode.CustomEditorProvider<FigDocument> {
  static readonly viewType = 'pairdraw.fig'

  private readonly sessions = new Map<string, EditorSession>()
  private readonly changes = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<FigDocument>>()

  readonly onDidChangeCustomDocument = this.changes.event

  constructor(
    private readonly extensionURI: vscode.Uri,
    private readonly host: ExtensionHost = vscodeHost
  ) {}

  openCustomDocument(uri: vscode.Uri): FigDocument {
    return { uri, dispose: () => undefined }
  }

  resolveCustomEditor(
    document: FigDocument,
    panel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    const configured =
      vscode.workspace.getConfiguration('pairdraw').get<string>('editorUrl') ?? DEFAULT_EDITOR_URL
    const editorURL = parseEditorURL(configured)
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionURI, 'dist')]
    }
    if (!editorURL) {
      panel.webview.html = errorHTML(`pairdraw.editorUrl is not an http(s) URL: ${configured}`)
      return
    }
    const nonce = randomBytes(16).toString('hex')
    panel.webview.html = embedWebviewHTML({
      cspSource: panel.webview.cspSource,
      scriptUri: panel.webview
        .asWebviewUri(vscode.Uri.joinPath(this.extensionURI, 'dist', 'webview.js'))
        .toString(),
      editorUrl: editorURL.toString(),
      nonce
    })
    const session = new EditorSession(this.host, document, panel, (edited: vscode.CustomDocument) =>
      this.changes.fire({
        document: edited,
        label: 'Edit document',
        undo: () => this.reveal(edited.uri),
        redo: () => this.reveal(edited.uri)
      })
    )
    this.sessions.set(document.uri.toString(), session)
    panel.onDidDispose(() => {
      session.dispose()
      this.sessions.delete(document.uri.toString())
    })
  }

  saveCustomDocument(document: FigDocument): Thenable<void> {
    return this.sessions.get(document.uri.toString())?.save() ?? Promise.resolve()
  }

  saveCustomDocumentAs(document: FigDocument, destination: vscode.Uri): Thenable<void> {
    return this.sessions.get(document.uri.toString())?.save(destination) ?? Promise.resolve()
  }

  revertCustomDocument(document: FigDocument): Thenable<void> {
    return this.sessions.get(document.uri.toString())?.reload() ?? Promise.resolve()
  }

  backupCustomDocument(
    document: FigDocument,
    context: vscode.CustomDocumentBackupContext,
    _token: vscode.CancellationToken
  ): Thenable<vscode.CustomDocumentBackup> {
    const session = this.sessions.get(document.uri.toString())
    if (!session) {
      return vscode.workspace.fs.copy(document.uri, context.destination).then(() => ({
        id: context.destination.toString(),
        delete: () => {
          void vscode.workspace.fs.delete(context.destination)
        }
      }))
    }
    return session.save(context.destination).then(() => ({
      id: context.destination.toString(),
      delete: () => {
        void vscode.workspace.fs.delete(context.destination)
      }
    }))
  }

  /** The open session for a document, so commands can ask the editor for its selection. */
  sessionFor(uri: vscode.Uri): EditorSession | undefined {
    return this.sessions.get(uri.toString())
  }

  dispose(): void {
    this.changes.dispose()
  }

  private reveal(uri: vscode.Uri): Promise<void> {
    this.sessions.get(uri.toString())?.reveal()
    return Promise.resolve()
  }
}

function errorHTML(message: string): string {
  const escaped = message.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  return `<!DOCTYPE html><html lang="en"><body><p>Pairdraw: ${escaped}</p></body></html>`
}
