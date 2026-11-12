import type * as vscode from 'vscode'

/**
 * The editor capabilities the extension's own logic reaches for. The extension host supplies the
 * real one; tests supply a stand-in, which keeps that logic runnable without VS Code.
 */
export interface ExtensionHost {
  readFile(uri: vscode.Uri): Thenable<Uint8Array>
  writeFile(uri: vscode.Uri, data: Uint8Array): Thenable<void>
  showError(message: string): void
  saveDialog(options: vscode.SaveDialogOptions): Thenable<vscode.Uri | undefined>
}
