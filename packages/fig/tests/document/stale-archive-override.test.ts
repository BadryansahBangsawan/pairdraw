import { expect, test } from 'bun:test'

import { figArchiveOf } from '#fig-tests/helpers/fig-fixtures'
import { materializeFigArchive } from '#fig/document/materialize'

import type { NodeChange } from '@pairdraw/kiwi/fig/codec'

const guid = (sessionID: number, localID: number) => ({ sessionID, localID })

/**
 * Figma keeps an override that names a layer deleted from a nested component. Opening the file
 * skips that record; eager archive assembly must not refuse the whole document over it.
 */
test('an archive with a nested override naming a deleted layer opens', async () => {
  const records = [
    { guid: guid(0, 0), type: 'DOCUMENT', phase: 'CREATED' },
    {
      guid: guid(0, 1),
      type: 'CANVAS',
      name: 'Page',
      parentIndex: { guid: guid(0, 0), position: '!' }
    },
    {
      guid: guid(1, 1),
      type: 'SYMBOL',
      name: 'Avatar',
      parentIndex: { guid: guid(0, 1), position: '!' }
    },
    {
      guid: guid(1, 2),
      type: 'RECTANGLE',
      name: 'Body',
      parentIndex: { guid: guid(1, 1), position: '!' }
    },
    {
      guid: guid(2, 1),
      type: 'SYMBOL',
      name: 'Card',
      parentIndex: { guid: guid(0, 1), position: '"' }
    },
    {
      guid: guid(2, 2),
      type: 'INSTANCE',
      name: 'Avatar',
      parentIndex: { guid: guid(2, 1), position: '!' },
      symbolData: { symbolID: guid(1, 1) }
    },
    {
      guid: guid(2, 3),
      type: 'INSTANCE',
      name: 'Card',
      parentIndex: { guid: guid(0, 1), position: '#' },
      symbolData: {
        symbolID: guid(2, 1),
        symbolOverrides: [
          {
            guidPath: { guids: [guid(2, 2), guid(1, 99)] },
            fillPaints: [
              {
                type: 'SOLID',
                color: { r: 1, g: 0, b: 0, a: 1 },
                opacity: 1,
                visible: true,
                blendMode: 'NORMAL'
              }
            ]
          }
        ]
      }
    }
  ] as NodeChange[]

  const graph = materializeFigArchive(await figArchiveOf(records)).graph
  const instances = [...graph.getAllNodes()].filter((node) => node.type === 'INSTANCE')
  expect(instances.length).toBeGreaterThan(0)
})
