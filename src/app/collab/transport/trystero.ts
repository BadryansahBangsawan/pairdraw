import type * as TrysteroModule from '@trystero-p2p/mqtt'
import type { Room } from '@trystero-p2p/mqtt'

import { COLLAB_APP_ID } from '@/constants'

import type { CollabAction, CollabMediaTransport, JoinCollabRoom } from './types'

/**
 * Trystero announces a newcomer to the room's brokers four times in its first 7.5 seconds, so
 * after those and a WebRTC handshake everyone already in the room has met it.
 */
const TRYSTERO_DISCOVERY_MS = 12_000

type Trystero = typeof TrysteroModule

/**
 * Trystero and its MQTT client are loaded when a room is first joined, not with the editor, which
 * joins no peer-to-peer room unless asked. Until it arrives, calls on the room wait for it; no
 * peer can have met this one yet, so nothing is lost.
 */
let trysteroModule: Promise<Trystero> | null = null
let loadedTrystero: Trystero | null = null

function loadTrystero(): Promise<Trystero> {
  trysteroModule ??= import('@trystero-p2p/mqtt').then((module) => {
    loadedTrystero = module
    return module
  })
  return trysteroModule
}

function byteAction(room: Room, namespace: string) {
  return room.makeAction<Uint8Array>(namespace)
}

function trysteroMedia(withRoom: (use: (room: Room) => void) => void): CollabMediaTransport {
  let connection: (peerId: string) => RTCPeerConnection | undefined = () => undefined
  withRoom((room) => {
    connection = (peerId) => room.getPeers()[peerId]
  })
  return {
    addTrack(track, stream, peerId) {
      withRoom((room) => void Promise.allSettled(room.addTrack(track, stream, { target: peerId })))
    },
    removeTrack(track, peerId) {
      withRoom((room) => room.removeTrack(track, { target: peerId }))
    },
    replaceTrack(previous, next, peerId) {
      withRoom(
        (room) => void Promise.allSettled(room.replaceTrack(previous, next, { target: peerId }))
      )
    },
    onPeerTrack(handler) {
      withRoom((room) => {
        room.onPeerTrack = (track, _stream, peerId) => handler(track, peerId)
      })
    },
    connection: (peerId) => connection(peerId)
  }
}

/**
 * Whether any relay socket Trystero shares between this window's rooms is open. Its types leave
 * the sockets untyped, and MQTT's may wrap a WebSocket rather than be one.
 */
function relayOpen(): boolean {
  if (!loadedTrystero) return false
  const sockets: unknown = loadedTrystero.getRelaySockets()
  if (!sockets || typeof sockets !== 'object') return false
  return Object.values(sockets).some(
    (socket: unknown) =>
      typeof socket === 'object' &&
      socket !== null &&
      'readyState' in socket &&
      socket.readyState === WebSocket.OPEN
  )
}

export const joinTrysteroCollabRoom: JoinCollabRoom = (roomId) => {
  const joined = loadTrystero().then(({ joinRoom }) =>
    joinRoom(
      {
        appId: COLLAB_APP_ID,
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443?transport=tcp',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ]
        }
      },
      roomId
    )
  )
  // Calls made before Trystero has loaded run, in order, once the room exists.
  let room: Room | null = null
  const pending: Array<(room: Room) => void> = []
  void joined.then((joinedRoom) => {
    room = joinedRoom
    for (const use of pending.splice(0)) use(joinedRoom)
    return undefined
  })
  const withRoom = (use: (room: Room) => void) => {
    if (room) use(room)
    else pending.push(use)
  }

  return {
    makeAction(namespace): CollabAction {
      let action: ReturnType<typeof byteAction> | null = null
      withRoom((joinedRoom) => {
        action = byteAction(joinedRoom, namespace)
      })
      return [
        (data, peerId) => withRoom(() => void action?.send(data, peerId ? { target: peerId } : {})),
        (handler) =>
          withRoom(() => {
            if (action) {
              action.onMessage = (data, { peerId }) => handler(new Uint8Array(data), peerId)
            }
          })
      ]
    },
    onPeerJoin(handler) {
      withRoom((joinedRoom) => {
        joinedRoom.onPeerJoin = handler
      })
    },
    onPeerLeave(handler) {
      withRoom((joinedRoom) => {
        joinedRoom.onPeerLeave = handler
      })
    },
    // Brokers are shared by every room this window joins; any one of them carries announcements.
    signalingConnected: relayOpen,
    discoveryMs: TRYSTERO_DISCOVERY_MS,
    media: trysteroMedia(withRoom),
    leave: async () => {
      await (await joined).leave()
    }
  }
}
