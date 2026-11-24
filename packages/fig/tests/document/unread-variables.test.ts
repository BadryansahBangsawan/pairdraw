import { expect, test } from 'bun:test'

import { guid } from '#fig-tests/helpers/guid'
import { materializeDocument } from '#fig/document/materialize'

import { figArchiveRecordInfo } from '@pairdraw/fig'
import type { NodeChange } from '@pairdraw/kiwi/fig/codec'

/** A paint value as Figma writes it; the pinned schema has no PAINT type or paint values. */
function paintValue(blendMode: string) {
  return {
    paintValue: {
      type: 'SOLID',
      color: { r: 0, g: 1, b: 0, a: 1 },
      opacity: 1,
      visible: true,
      blendMode
    }
  }
}

/** A collection with one COLOR variable and one PAINT variable, as Apple's iOS kit holds. */
function resources(): NodeChange[] {
  return [
    {
      guid: guid(3),
      type: 'VARIABLE_SET',
      name: 'Color Scheme',
      variableSetModes: [
        { id: guid(10), name: 'Light' },
        { id: guid(11), name: 'Dark' }
      ]
    },
    {
      guid: guid(4),
      type: 'VARIABLE',
      name: 'Accent',
      variableResolvedType: 'COLOR',
      variableSetID: { guid: guid(3) },
      variableDataValues: {
        entries: [
          {
            modeID: guid(10),
            variableData: { dataType: 'COLOR', value: { colorValue: { r: 0, g: 0, b: 1, a: 1 } } }
          },
          {
            modeID: guid(11),
            variableData: {
              dataType: 'COLOR',
              value: { colorValue: { r: 0, g: 0, b: 0.5, a: 1 } }
            }
          }
        ]
      }
    },
    {
      guid: guid(5),
      type: 'VARIABLE',
      name: 'Fill Variables/Alert/Button BG',
      variableSetID: { guid: guid(3) },
      ...({
        variableResolvedType: 'PAINT',
        variableDataValues: {
          entries: [
            {
              modeID: guid(10),
              variableData: {
                dataType: 'PAINT',
                resolvedDataType: 'PAINT',
                value: paintValue('LINEAR_BURN')
              }
            },
            {
              modeID: guid(11),
              variableData: {
                dataType: 'PAINT',
                resolvedDataType: 'PAINT',
                value: paintValue('LINEAR_DODGE')
              }
            }
          ]
        }
      } as Partial<NodeChange>)
    }
  ]
}

test('a strict read refuses a variable of a type the reader does not model', () => {
  expect(() => materializeDocument(resources())).toThrow('Unsupported document resource VARIABLE')
})

test('a reported unread variable stays out of the graph and the file keeps it', () => {
  const reported: NodeChange[] = []
  const { graph } = materializeDocument(resources(), [], {
    onUnsupportedVariableType: (resource) => reported.push(resource)
  })
  const collection = graph.variableCollections.get('1:3')
  expect(collection?.modes.map((mode) => mode.name)).toEqual(['Light', 'Dark'])
  expect(collection?.variableIds).toEqual(['1:4'])
  expect(graph.variables.get('1:4')?.valuesByMode).toEqual({
    '1:10': { r: 0, g: 0, b: 1, a: 1 },
    '1:11': { r: 0, g: 0, b: 0.5, a: 1 }
  })
  expect(graph.variables.get('1:5')).toBeUndefined()
  expect(reported).toHaveLength(1)
  expect(reported[0]).toMatchObject({
    type: 'VARIABLE',
    name: 'Fill Variables/Alert/Button BG',
    variableResolvedType: 'PAINT'
  })
})

test('the archive names an unread variable and the collection it belongs to', () => {
  const info = figArchiveRecordInfo({
    records: resources(),
    resources: resources(),
    blobCount: 0,
    imageHashes: []
  })
  expect(info.unreadVariables.map((entry) => entry.record.name)).toEqual([
    'Fill Variables/Alert/Button BG'
  ])
  expect(info.unreadVariables[0]?.collectionId).toBe('1:3')
})
