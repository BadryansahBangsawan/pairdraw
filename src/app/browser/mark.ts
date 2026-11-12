import { IS_TAURI } from '@/constants'

import { browserState } from './state'
import { markBrowserElement } from './window'

/**
 * Hovering a chat chip outlines that element in the browser window. The page address must be the
 * one the chip stored, compared as the whole string. A different page, a closed window, or a
 * missing chip does not ask the page to draw. A selector that matches nothing is the page's own
 * answer: it draws no box. The box is a temporary change on the page, the same kind the element
 * pick makes, and it is the user's pointer, not an agent action.
 */

export interface ElementMarkActions {
  show(selector: string): Promise<void>
  clear(): Promise<void>
}

/** Points a chip at the live element, or does nothing when the open page is a different one. */
export async function applyElementMarkHover(
  mark: { url: string; selector: string } | null,
  on: boolean,
  page: { open: boolean; url: string | null },
  actions: ElementMarkActions
): Promise<void> {
  if (!mark || !page.open || page.url !== mark.url) return
  if (on) await actions.show(mark.selector)
  else await actions.clear()
}

function pageError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** A closed window rejects the command. The outline is already gone, so the chip stays quiet. */
async function askPage(selector: string): Promise<void> {
  if (!IS_TAURI) return
  try {
    await markBrowserElement(selector)
  } catch (error) {
    const message = pageError(error)
    if (message.startsWith('The browser window is not open')) return
    console.warn(message)
  }
}

/** The chip's pointer. A browser build and a closed window do nothing. */
export async function hoverElementMark(
  mark: { url: string; selector: string } | null,
  on: boolean
): Promise<void> {
  await applyElementMarkHover(mark, on, browserState, {
    show: askPage,
    clear: () => askPage('')
  })
}
