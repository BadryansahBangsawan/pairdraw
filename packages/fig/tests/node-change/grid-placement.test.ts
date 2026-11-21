import { describe, expect, test } from 'bun:test'

import { gridPositionFromAnchors } from '#fig/node-change/convert'

const columns = [
  { id: { sessionID: 1, localID: 10 }, position: '!' },
  { id: { sessionID: 1, localID: 12 }, position: '"' },
  { id: { sessionID: 1, localID: 11 }, position: '#' }
]
const rows = [
  { id: { sessionID: 1, localID: 20 }, position: '!' },
  { id: { sessionID: 1, localID: 21 }, position: '"' }
]
const frame = {
  stackMode: 'GRID',
  gridColumns: { entries: columns },
  gridRows: { entries: rows }
}

describe('grid child placement', () => {
  test('uses track order, not GUID order, and keeps spans', () => {
    const child = {
      gridColumnAnchor: { sessionID: 1, localID: 11 },
      gridRowAnchor: { sessionID: 1, localID: 21 },
      gridColumnSpan: 2
    }
    expect(gridPositionFromAnchors(child, frame)).toEqual({
      row: 1,
      column: 2,
      rowSpan: 1,
      columnSpan: 2
    })
  })

  test('leaves an auto-placed child without a cell', () => {
    expect(gridPositionFromAnchors({}, frame)).toBeNull()
    expect(gridPositionFromAnchors({ gridRowAnchor: rows[0].id }, frame)).toBeNull()
  })
})
