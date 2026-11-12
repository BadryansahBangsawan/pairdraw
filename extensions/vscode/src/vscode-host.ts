import * as vscode from 'vscode'

import type { ExtensionHost } from './host'

/** The real editor behind `ExtensionHost`; only the extension host imports this module. */
export const vscodeHost: ExtensionHost = {
  readFile: (uri) => vscode.workspace.fs.readFile(uri),
  writeFile: (uri, data) => vscode.workspace.fs.writeFile(uri, data),
  showError: (message) => {
    void vscode.window.showErrorMessage(message)
  },
  saveDialog: (options) => vscode.window.showSaveDialog(options)
}
