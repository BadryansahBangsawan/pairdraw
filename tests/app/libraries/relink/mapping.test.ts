import { describe, expect, test } from 'bun:test'

import { createLibraryRevision, materializeLibraryAsset } from '@pairdraw/core/library'
import { SceneGraph } from '@pairdraw/scene-graph'

import {
  findMissingLibraries,
  planLibraryRelink,
  planRelinkedInstances
} from '@/app/libraries/relink'

type SourceAsset =
  | { kind: 'component'; name: string; key: string }
  | { kind: 'set'; name: string; key: string; sizes: string[] }

function librarySource(assets: SourceAsset[]) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  for (const asset of assets) {
    if (asset.kind === 'component') {
      graph.createNode('COMPONENT', page.id, { name: asset.name, componentKey: asset.key })
      continue
    }
    const set = graph.createNode('COMPONENT_SET', page.id, {
      name: asset.name,
      componentKey: asset.key
    })
    asset.sizes.forEach((size, index) => {
      graph.createNode('COMPONENT', set.id, {
        name: `Size=${size}`,
        y: index * 50,
        componentPropertyValues: { Size: size }
      })
    })
  }
  return graph
}

function revision(libraryId: string, assets: SourceAsset[]) {
  return createLibraryRevision({ libraryId, name: libraryId, graph: librarySource(assets) })
}

function instanceOf(graph: SceneGraph, componentId: string) {
  return graph.createNode('INSTANCE', graph.getPages()[0].id, { componentId })
}

describe('missing libraries', () => {
  test('lists enabled libraries no catalog could read, with what the document uses', async () => {
    const old = await revision('old-ds', [
      { kind: 'component', name: 'Button', key: 'button' },
      { kind: 'component', name: 'Card', key: 'card' }
    ])
    const consumer = new SceneGraph()
    const button = materializeLibraryAsset(consumer, old, 'button')
    materializeLibraryAsset(consumer, old, 'card')
    instanceOf(consumer, button.componentId)
    instanceOf(consumer, button.componentId)

    expect(findMissingLibraries(consumer, new Set())).toEqual([
      { libraryId: 'old-ds', assetCount: 2, instanceCount: 2 }
    ])
    expect(findMissingLibraries(consumer, new Set(['old-ds']))).toEqual([])
  })

  test('a disabled library is not missing', async () => {
    const old = await revision('old-ds', [{ kind: 'component', name: 'Button', key: 'button' }])
    const consumer = new SceneGraph()
    materializeLibraryAsset(consumer, old, 'button')
    consumer.enabledLibraries.set('old-ds', {
      libraryId: 'old-ds',
      revisionId: old.manifest.revisionId,
      enabled: false
    })

    expect(findMissingLibraries(consumer, new Set())).toEqual([])
  })
})

describe('relink mapping', () => {
  test('matches by asset key, then by a unique name and type, and reports the rest', async () => {
    const old = await revision('old-ds', [
      { kind: 'component', name: 'Button', key: 'button' },
      { kind: 'component', name: 'Card', key: 'card-v1' },
      { kind: 'component', name: 'Badge', key: 'badge' },
      { kind: 'component', name: 'Chip', key: 'chip' }
    ])
    const target = await revision('new-ds', [
      { kind: 'component', name: 'Primary button', key: 'button' },
      { kind: 'component', name: 'Card', key: 'card-v2' },
      { kind: 'component', name: 'Chip', key: 'chip-a' },
      { kind: 'set', name: 'Chip', key: 'chip-b', sizes: ['Small'] },
      { kind: 'component', name: 'Badge', key: 'badge-a' },
      { kind: 'component', name: 'Badge', key: 'badge-b' }
    ])
    const consumer = new SceneGraph()
    for (const key of ['button', 'card-v1', 'badge', 'chip'])
      materializeLibraryAsset(consumer, old, key)

    const plan = planLibraryRelink(consumer, 'old-ds', target.manifest)

    expect(plan.fromLibraryId).toBe('old-ds')
    expect(plan.toLibraryId).toBe('new-ds')
    expect(Object.fromEntries(plan.assetKeys)).toEqual({
      button: 'button',
      'card-v1': 'card-v2',
      chip: 'chip-a'
    })
    // Two assets share the name Badge, so neither is a safe match.
    expect(plan.unmatched).toEqual(['Badge'])
  })

  test('maps assets once when the document holds copies from several revisions', async () => {
    const first = await revision('old-ds', [{ kind: 'component', name: 'Button', key: 'button' }])
    const second = await createLibraryRevision({
      libraryId: 'old-ds',
      name: 'old-ds',
      graph: (() => {
        const graph = librarySource([{ kind: 'component', name: 'Button', key: 'button' }])
        const page = graph.getPages()[0]
        graph.createNode('TEXT', graph.getChildren(page.id)[0].id, { name: 'Label', text: 'v2' })
        return graph
      })(),
      previousRevisionId: first.manifest.revisionId
    })
    const target = await revision('new-ds', [{ kind: 'component', name: 'Button', key: 'button' }])
    const consumer = new SceneGraph()
    const oldCopy = materializeLibraryAsset(consumer, first, 'button')
    const newerCopy = materializeLibraryAsset(consumer, second, 'button')
    const onFirst = instanceOf(consumer, oldCopy.componentId)
    const onSecond = instanceOf(consumer, newerCopy.componentId)

    const plan = planLibraryRelink(consumer, 'old-ds', target.manifest)
    expect([...plan.assetKeys]).toEqual([['button', 'button']])
    expect(findMissingLibraries(consumer, new Set())[0]?.assetCount).toBe(1)

    const relinked = materializeLibraryAsset(consumer, target, 'button')
    const updates = planRelinkedInstances(consumer, plan, target.manifest.revisionId)
    expect(updates.map((update) => [update.instanceId, update.componentId]).sort()).toEqual(
      [
        [onFirst.id, relinked.componentId],
        [onSecond.id, relinked.componentId]
      ].sort()
    )
  })

  test('moves instances to the matching variant and falls back when it is gone', async () => {
    const old = await revision('old-ds', [
      { kind: 'set', name: 'Button', key: 'button', sizes: ['Small', 'Large'] }
    ])
    const target = await revision('new-ds', [
      { kind: 'set', name: 'Button', key: 'button', sizes: ['Medium', 'Small'] }
    ])
    const consumer = new SceneGraph()
    const copied = materializeLibraryAsset(consumer, old, 'button')
    const setId = copied.componentSetId
    if (!setId) throw new Error('Expected a component set')
    const [small, large] = consumer.getChildren(setId)
    if (!small || !large) throw new Error('Expected two variants')
    const smallInstance = instanceOf(consumer, small.id)
    const largeInstance = instanceOf(consumer, large.id)

    const plan = planLibraryRelink(consumer, 'old-ds', target.manifest)
    const relinked = materializeLibraryAsset(consumer, target, 'button')
    const relinkedSet = relinked.componentSetId
    if (!relinkedSet) throw new Error('Expected a relinked component set')
    const [medium, relinkedSmall] = consumer.getChildren(relinkedSet)
    const updates = planRelinkedInstances(consumer, plan, target.manifest.revisionId)

    expect(updates).toContainEqual({
      instanceId: smallInstance.id,
      previousComponentId: small.id,
      componentId: relinkedSmall?.id,
      fallback: false
    })
    expect(updates).toContainEqual({
      instanceId: largeInstance.id,
      previousComponentId: large.id,
      componentId: medium?.id,
      fallback: true
    })
  })

  test('plans nothing for assets the chosen library has no copy of in the document', async () => {
    const old = await revision('old-ds', [{ kind: 'component', name: 'Button', key: 'button' }])
    const target = await revision('new-ds', [{ kind: 'component', name: 'Button', key: 'button' }])
    const consumer = new SceneGraph()
    const copied = materializeLibraryAsset(consumer, old, 'button')
    instanceOf(consumer, copied.componentId)

    const plan = planLibraryRelink(consumer, 'old-ds', target.manifest)
    expect(planRelinkedInstances(consumer, plan, target.manifest.revisionId)).toEqual([])
  })
})
