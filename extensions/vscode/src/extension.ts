import * as vscode from 'vscode'

import { exportSelection } from './commands/export'
import { COMMAND_IDS } from './commands/ids'
import { FIG_VIEW_TYPE, PEN_VIEW_TYPE, toggledViewType } from './fig/formats'
import { FigEditorProvider } from './fig/provider'
import type { EditorSession } from './fig/session'
import { SidebarViewProvider } from './sidebar/view'
import { vscodeHost } from './vscode-host'
import { DEFAULT_EDITOR_URL, parseEditorURL } from './webview/html'

export function activate(context: vscode.ExtensionContext): void {
  const options = {
    // Hiding the tab must not dispose the webview: the editor holds edits VS Code has not
    // saved yet, and reloading the iframe would lose them.
    webviewOptions: { retainContextWhenHidden: true },
    supportsMultipleEditorsPerDocument: false
  }
  const providers: FigEditorProvider[] = []
  for (const viewType of [FIG_VIEW_TYPE, PEN_VIEW_TYPE]) {
    const provider = new FigEditorProvider(context.extensionUri)
    providers.push(provider)
    context.subscriptions.push(
      provider,
      vscode.window.registerCustomEditorProvider(viewType, provider, options)
    )
  }
  const sessionFor = (uri: vscode.Uri) =>
    providers.find((provider) => provider.sessionFor(uri))?.sessionFor(uri)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.toggleDesignMode, () => toggleDesignMode()),
    vscode.commands.registerCommand(COMMAND_IDS.openEditor, () => openEditor()),
    vscode.commands.registerCommand(COMMAND_IDS.exportSelection, () =>
      exportActiveSelection(sessionFor)
    ),
    vscode.window.registerWebviewViewProvider(
      SidebarViewProvider.viewType,
      new SidebarViewProvider()
    )
  )
}

/**
 * Switches the active `.pen` or `.fig` between Design Mode and VS Code's own editor. The tab that
 * opened the command decides the direction, so the same command serves either side.
 */
export async function toggleDesignMode(): Promise<void> {
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input
  if (!(input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputText)) return
  const viewType = input instanceof vscode.TabInputCustom ? input.viewType : 'default'
  const target = toggledViewType(viewType, input.uri.path)
  if (!target) return
  await vscode.commands.executeCommand('vscode.openWith', input.uri, target)
}

/** Opens the configured web editor in the system browser, outside the extension host. */
export async function openEditor(): Promise<void> {
  const configured =
    vscode.workspace.getConfiguration('pairdraw').get<string>('editorUrl') ?? DEFAULT_EDITOR_URL
  const url = parseEditorURL(configured)
  if (!url) {
    await vscode.window.showErrorMessage(
      `Pairdraw: pairdraw.editorUrl is not an http(s) URL: ${configured}`
    )
    return
  }
  await vscode.env.openExternal(vscode.Uri.parse(url.toString()))
}

/** Exports the active Design Mode tab's selection; a text tab has no editor to ask. */
export async function exportActiveSelection(
  sessionFor: (uri: vscode.Uri) => EditorSession | undefined
): Promise<void> {
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input
  if (!(input instanceof vscode.TabInputCustom)) {
    await vscode.window.showInformationMessage('Pairdraw: open a document in Design Mode first')
    return
  }
  const session = sessionFor(input.uri)
  if (!session) {
    await vscode.window.showInformationMessage('Pairdraw: the editor is still loading')
    return
  }
  await exportSelection(session, input.uri, vscodeHost)
}

export function deactivate(): void {
  // The providers close their webviews with the extension host.
}
