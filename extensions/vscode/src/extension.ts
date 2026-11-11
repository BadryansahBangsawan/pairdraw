import * as vscode from 'vscode'

import { FIG_VIEW_TYPE, PEN_VIEW_TYPE, toggledViewType } from './fig/formats'
import { FigEditorProvider } from './fig/provider'

export function activate(context: vscode.ExtensionContext): void {
  const options = {
    // Hiding the tab must not dispose the webview: the editor holds edits VS Code has not
    // saved yet, and reloading the iframe would lose them.
    webviewOptions: { retainContextWhenHidden: true },
    supportsMultipleEditorsPerDocument: false
  }
  for (const viewType of [FIG_VIEW_TYPE, PEN_VIEW_TYPE]) {
    const provider = new FigEditorProvider(context.extensionUri)
    context.subscriptions.push(
      provider,
      vscode.window.registerCustomEditorProvider(viewType, provider, options)
    )
  }
  context.subscriptions.push(
    vscode.commands.registerCommand('pairdraw.toggleDesignMode', () => toggleDesignMode())
  )
}

/**
 * Switches the active `.pen` or `.fig` between Design Mode and VS Code's own editor. The tab that
 * opened the command decides the direction, so the same command serves either side.
 */
export async function toggleDesignMode(): Promise<void> {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab
  const input = tab?.input
  const path = input instanceof vscode.TabInputText ? input.uri.path : null
  const viewType =
    input instanceof vscode.TabInputCustom
      ? input.viewType
      : input instanceof vscode.TabInputText
        ? 'default'
        : null
  if (path === null || viewType === null) return
  const target = toggledViewType(viewType, path)
  if (!target) return
  const uri = (input as vscode.TabInputText | vscode.TabInputCustom).uri
  await vscode.commands.executeCommand('vscode.openWith', uri, target)
}

export function deactivate(): void {
  // The providers close their webviews with the extension host.
}