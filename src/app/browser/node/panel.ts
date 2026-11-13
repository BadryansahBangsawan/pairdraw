import type { Editor } from '@open-pencil/core'
import { readBrowserNode, withBrowserNode } from '@open-pencil/scene-graph/browser-node'

import { IS_TAURI } from '@/constants'

import { currentDevice, setDevice } from '../state'
import { BROWSER_DESKTOP_ONLY } from '../tools'
import { openBrowserWindow, sizeBrowserWindow } from '../window'
import { browserNodeSession } from './command'
import { browserNodeActionError, browserNodeAddress, browserNodePreset } from './picture'

const MISSING_LAYER = 'That layer is not on the canvas.'
const NOT_SNAPSHOT = 'That layer is not a browser snapshot.'
const ADDRESS_REFUSED = 'That address is not a page the browser can open.'
const UNDO_LABEL = 'Edit browser snapshot'

type SnapshotStore = Pick<Editor, 'graph' | 'updateNodeWithUndo'>

/**
 * Writes a snapshot's address in one undo step. The same address, or one the window would
 * refuse, leaves the layer alone. Nothing here loads a page.
 */
export function saveBrowserNodeAddress(
  store: SnapshotStore,
  nodeId: string,
  draft: string
): { ok: true } | { ok: false; error: string } {
  const node = store.graph.getNode(nodeId)
  if (!node) return { ok: false, error: MISSING_LAYER }
  const stored = readBrowserNode(node)
  if (!stored) return { ok: false, error: NOT_SNAPSHOT }
  const address = browserNodeAddress(draft)
  if (!address.ok) return address
  if (address.url === stored.url) return { ok: true }
  const pluginData = withBrowserNode(node, { ...stored, url: address.url })
  if (!readBrowserNode({ pluginData })) return { ok: false, error: ADDRESS_REFUSED }
  store.updateNodeWithUndo(nodeId, { pluginData }, UNDO_LABEL)
  return { ok: true }
}

/**
 * Writes a snapshot's device preset in one undo step, then selects that preset on the toolbar.
 * The open desktop window is resized to match. A closed window is not opened, and the picture
 * stays until the next refresh. The desktop preset's size is the window's own size.
 */
export function saveBrowserNodePreset(
  store: SnapshotStore,
  nodeId: string,
  preset: string,
  resize: (width: number, height: number) => Promise<void> = sizeBrowserWindow
): { ok: true } | { ok: false; error: string } {
  const node = store.graph.getNode(nodeId)
  if (!node) return { ok: false, error: MISSING_LAYER }
  const stored = readBrowserNode(node)
  if (!stored) return { ok: false, error: NOT_SNAPSHOT }
  const next = browserNodePreset(preset)
  if (next !== stored.preset) {
    const pluginData = withBrowserNode(node, { ...stored, preset: next })
    if (!readBrowserNode({ pluginData })) return { ok: false, error: NOT_SNAPSHOT }
    store.updateNodeWithUndo(nodeId, { pluginData }, UNDO_LABEL)
  }
  setDevice(next)
  const session = browserNodeSession()
  if (session.desktop && session.open) {
    const device = currentDevice()
    void resize(device.width, device.height).catch((error: unknown) => {
      const message =
        error instanceof Error && error.message !== ''
          ? error.message
          : 'The browser window could not be resized.'
      console.warn(message)
    })
  }
  return { ok: true }
}

/**
 * Opens the snapshot's page in the built-in window. Outside the desktop app this refuses
 * before Tauri is asked. It does not replace the stored picture.
 */
export async function openBrowserNodePage(
  url: string,
  open: (url: string) => Promise<void> = openBrowserWindow
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!IS_TAURI) return { ok: false, error: BROWSER_DESKTOP_ONLY }
  const address = browserNodeAddress(url)
  if (!address.ok) return address
  try {
    await open(address.url)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: browserNodeActionError(error) }
  }
}

const refreshedFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

/** A stored instant as a clock reading, or the stored text when it is not an instant. */
export function browserNodeRefreshedTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return refreshedFormat.format(date)
}
