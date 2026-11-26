import type { ChatTransport, UIMessage } from 'ai'

import type { Editor } from '@pairdraw/core'
import {
  shaderPlaybackStats,
  type ShaderPlaybackStats
} from '@pairdraw/vue/canvas/surface/shader/playback'

import type { CollabReturn } from '@/app/collab/context'
import type { RoomStatus } from '@/app/collab/room/status'
import type { EditorStore } from '@/app/editor/session/create'
import { createNavigationBenchmarkHooks } from '@/app/performance/navigation/hooks'
import type { NavigationBenchmarkHooks } from '@/app/performance/navigation/hooks'
import { appRuntimeConfig } from '@/app/runtime/config'
import { IS_BROWSER } from '@/constants'

interface PairdrawTestHooks {
  writeCount?: () => number
  mockHandle?: FileSystemFileHandle
  savedOpen?: Window['open']
  navigation?: NavigationBenchmarkHooks
  collab?: Pick<
    CollabReturn,
    'disconnect' | 'updateCursor' | 'updateSelection' | 'setLocalName'
  > & {
    /** Joins a room in a tab of its own, as pasting its link does. */
    connect: (roomId: string) => boolean
    /** Puts the active tab's document into the room, as Share does. */
    share: (roomId: string) => void
    peerCount: () => number
    peerSelections: () => Array<string[] | undefined>
    status: () => RoomStatus | null
  }
  /** Sends a request through the MCP bridge's command handler, as an MCP client's call arrives. */
  automation?: (command: string, args: unknown) => Promise<unknown>
  /** What the canvas plays: its players, the ones on screen, and whether its frame loop runs. */
  shaderPlayback?: () => ShaderPlaybackStats | null
}

export interface PairdrawWindowAPI {
  getStore?: () => EditorStore
  setChatTransport?: (factory: () => ChatTransport<UIMessage>) => void
  openFile?: (path: string) => Promise<void>
  test?: PairdrawTestHooks
}

let activeStore: EditorStore | null = null

function windowAPI(): PairdrawWindowAPI {
  window.pairdraw ??= {}
  window.pairdraw.getStore ??= () => {
    if (!activeStore) throw new Error('Pairdraw store not initialized')
    return activeStore
  }
  return window.pairdraw
}

export function setPairdrawStore(store: EditorStore) {
  activeStore = store
  if (!IS_BROWSER) return
  const api = windowAPI()
  if (appRuntimeConfig.navigationBenchmark) {
    const testHooks = (api.test ??= {})
    testHooks.navigation = createNavigationBenchmarkHooks(store)
  }
}

export function exposeCollaborationActions(
  collab: CollabReturn,
  joinRoom: (roomId: string) => boolean
) {
  if (!IS_BROWSER || !import.meta.env.DEV) return
  if (!appRuntimeConfig.test) return
  const testHooks = (windowAPI().test ??= {})
  testHooks.collab = {
    connect: joinRoom,
    disconnect: collab.disconnect,
    updateCursor: collab.updateCursor,
    updateSelection: collab.updateSelection,
    setLocalName: collab.setLocalName,
    peerCount: () => collab.remotePeers.value.length,
    peerSelections: () => collab.remotePeers.value.map((peer) => peer.selection),
    share: (roomId: string) => {
      collab.shareCurrentDoc(roomId)
    },
    status: () => collab.state.value.status
  }
}

/** Test runs send MCP requests the way the bridge delivers them, without a separate server. */
export function exposeAutomationRequests(
  handleRequest: (store: EditorStore, command: string, args: unknown) => Promise<unknown>
) {
  if (!IS_BROWSER || !import.meta.env.DEV) return
  if (!appRuntimeConfig.test) return
  const testHooks = (windowAPI().test ??= {})
  testHooks.automation = async (command, args) => {
    const store = windowAPI().getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return handleRequest(store, command, args)
  }
}

export function exposeChatTransportOverride(
  setChatTransport: (factory: () => ChatTransport<UIMessage>) => void
) {
  windowAPI().setChatTransport = setChatTransport
}

/**
 * Lets an end-to-end test read what a canvas plays, as a preview starts and stops its shaders.
 * Development builds with the test runtime only, like the other hooks beside it. The returned
 * disposer removes this store's hook and only while that store still owns it: a newer store
 * replaces the page-global hook, and must not lose it when an older store is disposed.
 */
export function exposeShaderPlayback(editor: Editor): () => void {
  if (!IS_BROWSER || !import.meta.env.DEV) return noopDispose
  if (!appRuntimeConfig.test) return noopDispose
  const testHooks = (windowAPI().test ??= {})
  const readStats = () => shaderPlaybackStats(editor)
  testHooks.shaderPlayback = readStats
  return () => {
    if (testHooks.shaderPlayback === readStats) delete testHooks.shaderPlayback
  }
}

/** The disposal of a hook that was never installed; named so no caller writes an empty function. */
function noopDispose(): undefined {
  return undefined
}

export function setPairdrawOpenFileHandler(openFile: (path: string) => Promise<void>) {
  windowAPI().openFile = openFile
}
