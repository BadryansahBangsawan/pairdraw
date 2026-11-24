import { expect, test } from 'bun:test'

import { nodeChangeToProps } from '@pairdraw/fig/node-change'

const guid = (localID: number) => ({ sessionID: 1, localID })

test('a damaged file’s grid gaps and tracks come back within limits', () => {
  const props = nodeChangeToProps(
    {
      type: 'FRAME',
      name: 'Grid',
      stackMode: 'GRID',
      gridRowGap: Number.NaN,
      gridColumnGap: -12,
      gridColumns: {
        entries: [
          { id: guid(1), position: '!' },
          { id: guid(2), position: '#' }
        ]
      },
      gridColumnsSizing: {
        entries: [
          { id: guid(1), trackSize: { maxSizing: { type: 'STRETCH', value: Number.NaN } } },
          { id: guid(2), trackSize: { maxSizing: { type: 'FLEX', value: 0 } } }
        ]
      }
    } as never,
    []
  )

  expect(props.gridRowGap).toBe(0)
  expect(props.gridColumnGap).toBe(0)
  expect(props.gridTemplateColumns).toEqual([
    { sizing: 'AUTO', value: 0 },
    { sizing: 'FR', value: 1 }
  ])
})
