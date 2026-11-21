import * as vscode from 'vscode'

import type { EditorProviderHost, ExtensionHost } from './host'

/** The real editor behind `ExtensionHost`; only the extension host imports this module. */
export const vscodeHost: ExtensionHost = {
  readFile: (uri) => vscode.workspace.fs.readFile(uri),
  writeFile: (uri, data) => vscode.workspace.fs.writeFile(uri, data),
  showError: (message) => {
    void vscode.window.showErrorMessage(message)
  },
  saveDialog: (options) => vscode.window.showSaveDialog(options)
}

/** The real editor behind `EditorProviderHost`: the same host, plus what the provider reaches for. */
export const vscodeEditorHost: EditorProviderHost = {
  ...vscodeHost,
  joinPath: (base, ...parts) => vscode.Uri.joinPath(base, ...parts),
  parseURI: (value) => vscode.Uri.parse(value),
  configuredEditorURL: () => vscode.workspace.getConfiguration('pairdraw').get<string>('editorUrl'),
  copyFile: (from, to) => vscode.workspace.fs.copy(from, to),
  deleteFile: (uri) => vscode.workspace.fs.delete(uri),
  createEventEmitter: <T>() => new vscode.EventEmitter<T>()
}
