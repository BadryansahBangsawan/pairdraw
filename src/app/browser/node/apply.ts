import type { Editor } from '@open-pencil/core'
import { TRANSPARENT } from '@open-pencil/core/constants'
import type { Fill } from '@open-pencil/scene-graph'
import {
  readBrowserNode,
  withBrowserNode,
  type BrowserNodeRecord
} from '@open-pencil/scene-graph/browser-node'
import { computeImageHash } from '@open-pencil/scene-graph/images'

import {
  browserNodeActionError,
  browserNodeAddress,
  browserNodeGate,
  browserNodePicture
} from './picture'
import type {
  BrowserNodeActions,
  BrowserNodeOutcome,
  BrowserNodeRefreshActions,
  BrowserNodeSession
} from './session'

const MISSING_LAYER = 'That layer is not on the canvas.'
const NOT_SNAPSHOT = 'That layer is not a browser snapshot.'

type Canvas = Pick<Editor, 'graph' | 'state' | 'recordEdit' | 'select'>

/**
 * Makes a snapshot of the open page: its address, the picture's pixel size, and the picture as
 * the layer's image. A refusal or a failed picture creates nothing. This does not open a window
 * and does not run when a file is opened.
 */
export async function createBrowserNodeFromPage(
  editor: Canvas,
  session: BrowserNodeSession,
  actions: BrowserNodeActions,
  refreshedAt: string
): Promise<BrowserNodeOutcome> {
  const blocked = browserNodeGate(session)
  if (blocked) return { ok: false, error: blocked }
  const address = browserNodeAddress(session.url ?? '')
  if (!address.ok) return address
  const shot = await takePicture(actions)
  if (!shot.ok) return shot
  const picture = browserNodePicture(shot.png, address.url, session.preset, refreshedAt)
  if (!picture.ok) return picture
  const id = editor.recordEdit({ label: 'Create browser snapshot' }, () =>
    placeSnapshot(editor, picture.record, picture.png)
  )
  return { ok: true, id }
}

/**
 * Replaces a snapshot's picture and the time it was taken, in one undo step. When the open page
 * is a different address, the already-open window is moved to the stored address first. A closed
 * window is not opened. A failed move or a failed picture leaves the layer as it was.
 */
export async function refreshBrowserNodeFromPage(
  editor: Canvas,
  nodeId: string,
  session: BrowserNodeSession,
  actions: BrowserNodeRefreshActions,
  refreshedAt: string
): Promise<BrowserNodeOutcome> {
  const node = editor.graph.getNode(nodeId)
  if (!node) return { ok: false, error: MISSING_LAYER }
  const stored = readBrowserNode(node)
  if (!stored) return { ok: false, error: NOT_SNAPSHOT }
  const blocked = browserNodeGate(session)
  if (blocked) return { ok: false, error: blocked }
  const address = browserNodeAddress(stored.url)
  if (!address.ok) return address
  const moved = await showStoredPage(session, actions, address.url)
  if (!moved.ok) return moved
  const shot = await takePicture(actions)
  if (!shot.ok) return shot
  const picture = browserNodePicture(shot.png, address.url, session.preset, refreshedAt)
  if (!picture.ok) return picture
  editor.recordEdit({ label: 'Refresh browser snapshot' }, () => {
    const hash = storePicture(editor, picture.png)
    editor.graph.updateNode(nodeId, {
      width: picture.record.width,
      height: picture.record.height,
      fills: [imageFill(hash)],
      pluginData: withBrowserNode(node, picture.record)
    })
  })
  return { ok: true, id: nodeId }
}

async function showStoredPage(
  session: BrowserNodeSession,
  actions: BrowserNodeRefreshActions,
  url: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const open = browserNodeAddress(session.url ?? '')
  if (open.ok && open.url === url) return { ok: true }
  try {
    await actions.navigate(url)
  } catch (error) {
    return { ok: false, error: browserNodeActionError(error) }
  }
  return { ok: true }
}

async function takePicture(
  actions: BrowserNodeActions
): Promise<{ ok: true; png: Uint8Array } | { ok: false; error: string }> {
  try {
    return { ok: true, png: await actions.screenshot() }
  } catch (error) {
    return { ok: false, error: browserNodeActionError(error) }
  }
}

function placeSnapshot(editor: Canvas, record: BrowserNodeRecord, png: Uint8Array): string {
  const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
    name: new URL(record.url).hostname,
    x: 0,
    y: 0,
    width: record.width,
    height: record.height,
    fills: [imageFill(storePicture(editor, png))],
    pluginData: withBrowserNode({ pluginData: [] }, record)
  })
  editor.select([node.id])
  return node.id
}

function storePicture(editor: Canvas, png: Uint8Array): string {
  const hash = computeImageHash(png)
  editor.graph.images.set(hash, png.slice())
  return hash
}

function imageFill(hash: string): Fill {
  return {
    type: 'IMAGE',
    imageHash: hash,
    imageScaleMode: 'FILL',
    color: TRANSPARENT,
    opacity: 1,
    visible: true
  }
}
