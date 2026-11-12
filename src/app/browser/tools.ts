import { fromUint8Array } from 'js-base64'

import type { Editor } from '@open-pencil/core'

import { importBrowserCapture } from './import'
import {
  acceptElementReading,
  acceptPageOutline,
  BROWSER_SELECTOR_LIMIT,
  BROWSER_SELECTOR_TOO_LONG
} from './read'
import { placeBrowserScreenshot } from './shot'
import { browserURLPolicy, type BrowserURLRejection } from './url'

/**
 * Commands for the open browser window. They are app commands, like listing documents: the MCP
 * package only forwards them. None of them is a raw CDP session, and none of them opens a window.
 * The toolbar does that. A closed window is an error here, before any call. A reading is text,
 * not a layer.
 */

export const BROWSER_TOOL_COMMANDS = [
  'browser_load_page',
  'browser_screenshot',
  'browser_element',
  'browser_screenshot_to_canvas',
  'browser_read_element',
  'browser_read_outline'
] as const

export type BrowserToolCommand = (typeof BROWSER_TOOL_COMMANDS)[number]

export const BROWSER_DESKTOP_ONLY = 'The browser window is desktop only.'
export const BROWSER_WINDOW_CLOSED = 'The browser window is not open.'
export const BROWSER_SHOT_KIND = 'The screenshot must be the view, the page, or an element.'

export { BROWSER_SELECTOR_TOO_LONG }

const URL_ERRORS: Record<BrowserURLRejection, string> = {
  empty: 'Type an address to open.',
  scheme: 'The browser opens http and https addresses only.',
  invalid: 'That address is not a page the browser can open.'
}

const SHOT_NAMES = { visible: 'View', full: 'Page', element: 'Element' } as const

export type BrowserToolShot = keyof typeof SHOT_NAMES

export type BrowserToolCall =
  | { command: 'browser_load_page'; url: string }
  | { command: 'browser_screenshot'; kind: BrowserToolShot }
  | { command: 'browser_element' }
  | { command: 'browser_screenshot_to_canvas'; kind: BrowserToolShot }
  | { command: 'browser_read_element'; selector: string }
  | { command: 'browser_read_outline' }

export function isBrowserToolCommand(command: string): command is BrowserToolCommand {
  return (BROWSER_TOOL_COMMANDS as readonly string[]).includes(command)
}

type ToolArgs = { [key: string]: unknown }

function isToolArgs(value: unknown): value is ToolArgs {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function shotKind(value: unknown): BrowserToolShot | null {
  if (value === 'visible' || value === 'full' || value === 'element') return value
  return null
}

/**
 * What one tool call may do. `desktop` is this build; `open` is the window session. Both have to
 * hold, or the call stops. Loading a page normalizes the address and does not create the window.
 */
export function browserToolCall(
  command: BrowserToolCommand,
  args: unknown,
  desktop: boolean,
  open: boolean
): { ok: true; call: BrowserToolCall } | { ok: false; error: string } {
  if (!desktop) return { ok: false, error: BROWSER_DESKTOP_ONLY }
  if (!open) return { ok: false, error: BROWSER_WINDOW_CLOSED }
  const record = isToolArgs(args) ? args : {}
  if (command === 'browser_load_page') {
    const policy = browserURLPolicy(typeof record.url === 'string' ? record.url : '')
    if (!policy.ok) return { ok: false, error: URL_ERRORS[policy.reason] }
    return { ok: true, call: { command, url: policy.url } }
  }
  if (command === 'browser_element' || command === 'browser_read_outline') {
    return { ok: true, call: { command } }
  }
  if (command === 'browser_read_element') {
    const selector = typeof record.selector === 'string' ? record.selector : ''
    if (!selector) return { ok: false, error: 'The element is not on the page' }
    if (selector.length > BROWSER_SELECTOR_LIMIT) {
      return { ok: false, error: BROWSER_SELECTOR_TOO_LONG }
    }
    return { ok: true, call: { command, selector } }
  }
  const kind = shotKind(record.kind)
  if (!kind) return { ok: false, error: BROWSER_SHOT_KIND }
  return { ok: true, call: { command, kind } }
}

/** The window moves the caller needs. Tests pass fakes; the app passes the Tauri commands. */
export interface BrowserToolActions {
  navigate(url: string): Promise<void>
  screenshot(kind: BrowserToolShot): Promise<Uint8Array>
  captureElement(): Promise<string>
  readElement(selector: string): Promise<string>
  readOutline(): Promise<string>
}

type BrowserCanvas = Pick<Editor, 'pasteStyledDocument' | 'placeImageFiles'>

/** Runs a call the policy already accepted. A cancel or a bad capture rejects with that sentence. */
export async function runBrowserTool(
  editor: BrowserCanvas,
  call: BrowserToolCall,
  actions: BrowserToolActions
): Promise<Record<string, unknown>> {
  if (call.command === 'browser_load_page') {
    await actions.navigate(call.url)
    return { loaded: true, url: call.url }
  }
  if (call.command === 'browser_screenshot') {
    const png = await actions.screenshot(call.kind)
    if (png.byteLength < 8) throw new Error('The page returned no picture')
    return { base64: fromUint8Array(png), mimeType: 'image/png' }
  }
  if (call.command === 'browser_read_element') {
    return acceptElementReading(await actions.readElement(call.selector))
  }
  if (call.command === 'browser_read_outline') {
    return acceptPageOutline(await actions.readOutline())
  }
  if (call.command === 'browser_element') {
    const html = await actions.captureElement()
    if (!(await importBrowserCapture(editor, html))) {
      throw new Error('The page returned no capture')
    }
    return { imported: true }
  }
  await placeBrowserScreenshot(editor, await actions.screenshot(call.kind), SHOT_NAMES[call.kind])
  return { placed: true }
}
