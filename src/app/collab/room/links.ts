import * as v from 'valibot'

import { bindDesktopLinkQueue } from '@/app/tauri/link-queue'
import { IS_BROWSER, IS_TAURI, WEB_APP_ORIGIN } from '@/constants'

/** Desktop events and commands for `pairdraw://join?room=<id>` links (`desktop/src/launch/mod.rs`). */
const ROOM_LINKS_EVENT = 'open-room-links'
const TAKE_PENDING_ROOMS = 'take_pending_rooms'

export function roomLinkURL(roomId: string): string {
  return `pairdraw://join?room=${encodeURIComponent(roomId)}`
}

/**
 * The link that invites someone into a room: the room's page on the web app this tab runs on, or
 * outside a browser on the hosted web app a build names; without one, the desktop app's
 * `pairdraw://join` link.
 */
export function getShareURL(roomId: string): string {
  if (IS_BROWSER && !IS_TAURI) return `${window.location.origin}/rooms/${roomId}`
  return WEB_APP_ORIGIN ? `${WEB_APP_ORIGIN}/rooms/${roomId}` : roomLinkURL(roomId)
}

/**
 * Opens the rooms of `pairdraw://join` links the desktop app received, at startup and while
 * running. The native side validates each room ID; `open` validates it again before joining.
 */
export function bindDesktopRoomLinks(open: (roomId: string) => void): Promise<() => void> {
  return bindDesktopLinkQueue({
    event: ROOM_LINKS_EVENT,
    command: TAKE_PENDING_ROOMS,
    schema: v.string(),
    label: 'Room link',
    open
  })
}
