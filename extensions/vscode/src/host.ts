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

/**
 * What the custom editor provider reaches for itself: URIs, the configuration it reads, the file
 * system a backup is copied through, and the emitter it reports edits with. `vscode-host.ts` is the
 * only module that binds these to VS Code, so the provider and its tests stay off the module.
 */
export interface EditorProviderHost extends ExtensionHost {
  joinPath(base: vscode.Uri, ...parts: string[]): vscode.Uri
  parseURI(value: string): vscode.Uri
  /** The user's `pairdraw.editorUrl`, or undefined when they have not set one. */
  configuredEditorURL(): string | undefined
  copyFile(from: vscode.Uri, to: vscode.Uri): Thenable<void>
  deleteFile(uri: vscode.Uri): Thenable<void>
  createEventEmitter<T>(): vscode.EventEmitter<T>
}
