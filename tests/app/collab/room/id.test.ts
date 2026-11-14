import { describe, expect, test } from 'bun:test'

import { parseRoomInput } from '@/app/collab/room/id'
import { getShareURL } from '@/app/collab/room/links'

const ROOM = 'abcdefghijklmnopqrstuvwxyz012345'

describe('room links and IDs', () => {
  test('reads the room ID from a bare ID or a room link, whatever surrounds it', () => {
    for (const input of [
      ROOM,
      `  ${ROOM}  `,
      `https://app.example.com/rooms/${ROOM}`,
      `https://app.example.com/rooms/${ROOM}/`,
      `https://app.example.com/rooms/${ROOM}?test#layers`,
      `pairdraw.localhost/rooms/${ROOM}#x`,
      `pairdraw://join?room=${ROOM}`
    ]) {
      expect(parseRoomInput(input)).toBe(ROOM)
    }
  })

  test('refuses text that is not a room ID, so it never joins a room nobody shared', () => {
    for (const input of [
      '',
      'e2e-collaboration-room',
      ROOM.slice(1),
      `${ROOM}0`,
      ROOM.toUpperCase(),
      `https://app.example.com/rooms/${ROOM.slice(0, 31)}!`,
      `https://app.example.com/demo`,
      `pairdraw://join?room=${ROOM.slice(1)}`,
      `pairdraw://join?room=${ROOM}x`
    ]) {
      expect(parseRoomInput(input)).toBeNull()
    }
  })

  test('a link shared outside a browser opens the desktop app when no web app is hosted', () => {
    expect(getShareURL(ROOM)).toBe(`pairdraw://join?room=${ROOM}`)
    expect(parseRoomInput(getShareURL(ROOM))).toBe(ROOM)
  })
})
