import type { Editor } from '@open-pencil/core'
import { TRANSPARENT } from '@open-pencil/core/constants'
import type { Fill } from '@open-pencil/scene-graph'
import {
  readBrowserNode,
  withBrowserNode,
  type BrowserNodeRecord
} from '@open-pencil/scene-graph/browser-node'
import { computeImageHash } from '@open-pencil/scene-graph/images'

import { BROWSER_NODE_FAILURE } from './failure'
import {
  browserNodeActionError,
  browserNodeAddress,
  browserNodeGate,
  browserNodePicture
} from './picture'
import type {
  BrowserNodeActions,
  BrowserNodeLoadWait,
  BrowserNodeOutcome,
  BrowserNodeRefreshActions,
  BrowserNodeSession
} from './session'

type Canvas = Pick<Editor, 'graph' | 'state' | 'recordEdit' | 'select'>

/**
 * Makes a snapshot of the open page: the address captured with the picture, the picture's pixel
 * size, and the picture as the layer's image. A refusal or a failed picture creates nothing.
 * This does not open a window and does not run when a file is opened.
 */
export async function createBrowserNodeFromPage(
  editor: Canvas,
  session: BrowserNodeSession,
  actions: BrowserNodeActions,
  refreshedAt: string
): Promise<BrowserNodeOutcome> {
  const blocked = browserNodeGate(session)
  if (blocked) return { ok: false, error: blocked }
  const opening = browserNodeAddress(session.url ?? '')
  if (!opening.ok) return opening
  const shot = await takePicture(actions)
  if (!shot.ok) return shot
  const address = browserNodeAddress(actions.capturedAddress() ?? '')
  if (!address.ok) return address
  const picture = browserNodePicture(shot.png, address.url, session.preset, refreshedAt)
  if (!picture.ok) return picture
  const id = editor.recordEdit({ label: 'Create browser snapshot' }, () =>
    placeSnapshot(editor, picture.record, picture.png)
  )
  return { ok: true, id }
}

/**
 * Replaces a snapshot's picture and the time it was taken, in one undo step. Undo covers that
 * layer write only: the picture, its pixel size, the preset, the time, and the address of the
 * page the picture is of. Moving the window is not an undo step.
 *
 * When the open page is a different address, the window is moved and the picture is taken only
 * after that load finishes. The stored address is the one captured with the picture. A refresh
 * that moved the window also requires that address to be the page the load finished on. A missed
 * load, a failed picture, or an address that was not captured leaves the layer as it was. A
 * closed window is not opened.
 */
export async function refreshBrowserNodeFromPage(
  editor: Canvas,
  nodeId: string,
  session: BrowserNodeSession,
  actions: BrowserNodeRefreshActions,
  refreshedAt: string
): Promise<BrowserNodeOutcome> {
  const node = editor.graph.getNode(nodeId)
  if (!node) return { ok: false, error: BROWSER_NODE_FAILURE.missingLayer }
  const stored = readBrowserNode(node)
  if (!stored) return { ok: false, error: BROWSER_NODE_FAILURE.notSnapshot }
  const blocked = browserNodeGate(session)
  if (blocked) return { ok: false, error: blocked }
  const address = browserNodeAddress(stored.url)
  if (!address.ok) return address
  const moved = await showStoredPage(session, actions, address.url)
  if (!moved.ok) return moved
  const shot = await takePicture(actions)
  if (!shot.ok) return shot
  const captured = browserNodeAddress(actions.capturedAddress() ?? '')
  if (!captured.ok) return captured
  if (moved.loaded !== null && captured.url !== moved.loaded) {
    return { ok: false, error: BROWSER_NODE_FAILURE.addressUncaptured }
  }
  const page = moved.loaded ?? captured.url
  const picture = browserNodePicture(shot.png, page, session.preset, refreshedAt)
  if (!picture.ok) return picture
  editor.recordEdit({ label: 'Refresh browser snapshot' }, () => {
    const hash = storePicture(editor, picture.png)
    editor.graph.updateNode(nodeId, {
      width: picture.record.width,
      height: picture.record.height,
      fills: replaceSnapshotFill(node.fills, hash),
      pluginData: withBrowserNode(node, picture.record)
    })
  })
  return { ok: true, id: nodeId }
}

async function showStoredPage(
  session: BrowserNodeSession,
  actions: BrowserNodeRefreshActions,
  url: string
): Promise<{ ok: true; loaded: string | null } | { ok: false; error: string }> {
  const open = browserNodeAddress(session.url ?? '')
  if (open.ok && open.url === url) return { ok: true, loaded: null }
  // Subscribe before the move, then accept a report only once the move has been requested.
  // Otherwise a fast load is missed, or the previous page is stored with the new address.
  let wait: BrowserNodeLoadWait | null = null
  try {
    wait = actions.waitForLoad()
    await wait.armed
    const moving = actions.navigate(url)
    wait.begin()
    await moving
    const loaded = browserNodeAddress(await wait.done)
    if (!loaded.ok) return loaded
    return { ok: true, loaded: loaded.url }
  } catch (error) {
    wait?.cancel()
    return { ok: false, error: browserNodeActionError(error) }
  }
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

/** The snapshot's own image fill. A fill the person added beside it stays, including a later image. */
function replaceSnapshotFill(fills: readonly Fill[], hash: string): Fill[] {
  const picture = imageFill(hash)
  const index = fills.findIndex((fill) => fill.type === 'IMAGE')
  if (index === -1) return [...fills, picture]
  return fills.map((fill, at) => (at === index ? picture : fill))
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
