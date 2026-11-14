import * as v from 'valibot'

import { ROOM_ID_CHARS, ROOM_ID_LENGTH } from '@/constants'

// The alphabet is plain lowercase letters and digits, so it needs no escaping in a class.
const roomIdSchema = v.pipe(
  v.string(),
  v.regex(new RegExp(`^[${ROOM_ID_CHARS}]{${ROOM_ID_LENGTH}}$`))
)

export function isRoomId(value: string): boolean {
  return v.is(roomIdSchema, value)
}

/** The room a desktop `pairdraw://join?room=<id>` link names, or null for any other text. */
function desktopRoomLink(text: string): string | null {
  if (!text.startsWith('pairdraw://join')) return null
  try {
    return new URL(text).searchParams.get('room')
  } catch {
    return null
  }
}

/**
 * The room ID in what someone pasted: a bare ID, a room link, with any query, hash, or trailing
 * slash, or a desktop `pairdraw://join` link. Null when it is not a room ID, so a mistyped link
 * never joins another room.
 */
export function parseRoomInput(text: string): string | null {
  let candidate = text.trim()
  const desktop = desktopRoomLink(candidate)
  if (desktop !== null) return isRoomId(desktop) ? desktop : null
  const roomIndex = candidate.lastIndexOf('/rooms/')
  if (roomIndex !== -1) candidate = candidate.slice(roomIndex + '/rooms/'.length)
  candidate = candidate.split(/[?#]/)[0] ?? ''
  candidate = candidate.replace(/\/+$/, '')
  return isRoomId(candidate) ? candidate : null
}
