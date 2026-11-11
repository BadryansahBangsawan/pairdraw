import { randomBytes } from 'node:crypto'

import * as vscode from 'vscode'

import { embedWebviewHtml, parseEditorUrl, DEFAULT_EDITOR_URL } from '../webview/html'
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
  private readonly changes = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<FigDocument>
  >()

  readonly onDidChangeCustomDocument = this.changes.event

  constructor(private readonly extensionUri: vscode.Uri) {}

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
    const editorUrl = parseEditorUrl(configured)
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')]
    }
    if (!editorUrl) {
      panel.webview.html = errorHtml(`pairdraw.editorUrl is not an http(s) URL: ${configured}`)
      return
    }
    const nonce = randomBytes(16).toString('hex')
    panel.webview.html = embedWebviewHtml({
      cspSource: panel.webview.cspSource,
      scriptUri: panel.webview
        .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js'))
        .toString(),
      editorUrl: editorUrl.toString(),
      nonce
    })
    const session = new EditorSession(document, panel, (edited) =>
      this.changes.fire({
        document: edited as FigDocument,
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

  dispose(): void {
    this.changes.dispose()
  }

  private reveal(uri: vscode.Uri): Promise<void> {
    this.sessions.get(uri.toString())?.reveal()
    return Promise.resolve()
  }
}

function errorHtml(message: string): string {
  const escaped = message
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
  return `<!DOCTYPE html><html lang="en"><body><p>Pairdraw: ${escaped}</p></body></html>`
}