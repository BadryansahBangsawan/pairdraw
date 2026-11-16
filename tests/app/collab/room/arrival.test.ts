import { describe, expect, test } from 'bun:test'

import { roomArrival } from '@/app/collab/room/arrival'

const ROOM = 'roomidroomidroomidroomidroomidroom'

describe('opening a shared room link', () => {
  test('joins the room a build with live rooms links to', () => {
    expect(roomArrival(ROOM, { included: true })).toEqual({ action: 'join', roomId: ROOM })
  })

  test('leaves a build without live rooms on what any other address opens', () => {
    expect(roomArrival(ROOM, { included: false })).toEqual({ action: 'unavailable' })
  })

  test('opens anything else as it would without the room', () => {
    expect(roomArrival(undefined, { included: true })).toEqual({ action: 'none' })
    expect(roomArrival(undefined, { included: false })).toEqual({ action: 'none' })
  })
})
