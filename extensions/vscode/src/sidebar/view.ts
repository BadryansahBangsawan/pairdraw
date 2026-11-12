import { randomBytes } from 'node:crypto'

import * as v from 'valibot'
import * as vscode from 'vscode'

import { COMMAND_IDS, SIDEBAR_VIEW_ID } from '../commands/ids'
import { sidebarHTML } from './html'

const sidebarMessageSchema = v.object({
  command: v.picklist(Object.values(COMMAND_IDS))
})

/** The activity-bar view: it only forwards its buttons to the commands the palette runs too. */
export class SidebarViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = SIDEBAR_VIEW_ID

  resolveWebviewView(view: vscode.WebviewView): void {
    view.webview.options = { enableScripts: true }
    view.webview.html = sidebarHTML(randomBytes(16).toString('hex'))
    view.webview.onDidReceiveMessage((raw: unknown) => {
      const message = v.safeParse(sidebarMessageSchema, raw)
      if (message.success) void vscode.commands.executeCommand(message.output.command)
    })
  }
}
