import { expect, test } from 'bun:test'

import { guid } from '#fig-tests/helpers/guid'
import { collectSceneDependencies } from '#fig/document/dependency-closure'
import { createResourceResolver } from '#fig/document/resource-reference'
import { createSourceIndex } from '#fig/instance-overrides/source-index'

import { materializeDocument } from '@pairdraw/fig'
import type { NodeChange } from '@pairdraw/kiwi/fig/codec'

test('retains external preferred choices separately from required component dependencies', () => {
  const changes = [
    { guid: guid(1), type: 'CANVAS' },
    {
      guid: guid(2),
      type: 'SYMBOL',
      parentIndex: { guid: guid(1), position: '!' },
      componentPropDefs: [
        {
          id: guid(90),
          type: 'INSTANCE_SWAP',
          initialValue: { guidValue: guid(3) },
          preferredValues: { instanceSwapValues: [{ key: 'external' }, { key: 'local' }] }
        }
      ]
    },
    { guid: guid(3), type: 'SYMBOL', key: 'local', parentIndex: { guid: guid(4), position: '!' } },
    { guid: guid(4), type: 'CANVAS', internalOnly: true }
  ] as NodeChange[]
  const result = collectSceneDependencies(changes, undefined, createSourceIndex(changes))
  expect(result.contentIds.has('1:3')).toBe(true)
  expect([...result.externalPreferredKeys]).toEqual(['external'])
  expect(result.missingIds.size).toBe(0)
})

test('includes component ownership without pulling in unrelated internal definitions', () => {
  const changes: NodeChange[] = [
    { guid: guid(1), type: 'DOCUMENT' },
    { guid: guid(2), type: 'CANVAS', parentIndex: { guid: guid(1), position: '!' } },
    {
      guid: guid(3),
      type: 'CANVAS',
      internalOnly: true,
      parentIndex: { guid: guid(1), position: '"' }
    },
    { guid: guid(4), type: 'FRAME', parentIndex: { guid: guid(3), position: '!' } },
    { guid: guid(5), type: 'SYMBOL', parentIndex: { guid: guid(4), position: '!' } },
    {
      guid: guid(6),
      type: 'INSTANCE',
      parentIndex: { guid: guid(4), position: '"' },
      symbolData: { symbolID: guid(99) }
    },
    {
      guid: guid(7),
      type: 'INSTANCE',
      parentIndex: { guid: guid(2), position: '!' },
      symbolData: { symbolID: guid(5) }
    }
  ]
  const result = collectSceneDependencies(changes, undefined, createSourceIndex(changes))
  expect([...result.contentIds].sort()).toEqual(['1:2', '1:5', '1:7'])
  expect(result.ancestorIds.has('1:4')).toBe(true)
  expect(result.missingIds.size).toBe(0)
  expect(result.contentIds.has('1:6')).toBe(false)
  const assembled = materializeDocument(changes)
  const componentId = assembled.sources.get('1:5')
  if (!componentId) throw new Error('Missing required component')
  expect(assembled.graph.getNode(componentId)?.parentId).toBe(assembled.sources.get('1:4'))
  expect(assembled.sources.has('1:6')).toBe(false)
  const closureChanges = [
    ...changes,
    {
      guid: guid(8),
      type: 'INSTANCE',
      parentIndex: { guid: guid(2), position: '"' },
      symbolData: { symbolID: guid(99) }
    }
  ] as NodeChange[]
  const reached = collectSceneDependencies(
    closureChanges,
    undefined,
    createSourceIndex(closureChanges)
  )
  expect([...reached.missingComponentIds]).toEqual(['1:99'])
  expect(reached.missingIds.size).toBe(0)
})

test('a page selection reuses document facts instead of scanning every record', () => {
  const changes = [
    { guid: guid(1), type: 'DOCUMENT' },
    { guid: guid(2), type: 'CANVAS', parentIndex: { guid: guid(1), position: '!' } },
    { guid: guid(3), type: 'CANVAS', parentIndex: { guid: guid(1), position: '"' } }
  ] as NodeChange[]
  for (let index = 0; index < 40; index++) {
    const page = index % 2 === 0 ? 2 : 3
    changes.push({
      guid: guid(10 + index),
      type: 'RECTANGLE',
      parentIndex: { guid: guid(page), position: String.fromCharCode(33 + index) }
    } as NodeChange)
  }
  const index = createSourceIndex(changes)
  const pageRecords = changes.filter((change) => change.type === 'CANVAS')
  const facts = {
    resolveReference: createResourceResolver(changes),
    availableIds: new Set(index.sources.keys()),
    pageRecords
  }
  let reads = 0
  const counted = new Proxy(changes, {
    get(target, key, receiver) {
      if (typeof key === 'string' && /^\d+$/.test(key)) reads++
      return Reflect.get(target, key, receiver)
    }
  }) as readonly NodeChange[]

  collectSceneDependencies(counted, new Set(['1:2']), index, undefined, facts)
  expect(reads).toBe(0)

  // Without the facts it derives them again, which is what made a page-by-page read quadratic.
  collectSceneDependencies(counted, new Set(['1:2']), index)
  expect(reads).toBeGreaterThan(changes.length)
})
