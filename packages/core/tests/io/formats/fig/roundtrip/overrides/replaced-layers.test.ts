import { beforeAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { parseFigBuffer } from '@pairdraw/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'
import {
  isReplacedLayer,
  replaceInstanceLayer,
  replacedComponentLayerId
} from '@pairdraw/scene-graph/instances'
import {
  PAIRDRAW_PLUGIN_DATA,
  PAIRDRAW_PLUGIN_ID
} from '@pairdraw/scene-graph/plugin-data'

import { releaseFigPopulationWorker } from '#core/kiwi/fig/population/client'

beforeAll(async () => {
  await initCodec()
})

async function reopen(graph: SceneGraph) {
  // Without its archive the export encodes every record, which is what this checks.
  releaseFigPopulationWorker(graph)
  const bytes = await exportFigFile(graph)
  return {
    reopened: await parseFigFile(bytes.slice().buffer),
    records: parseFigBuffer(bytes.slice().buffer).nodeChanges
  }
}

function named(graph: SceneGraph, name: string): SceneNode {
  return expectDefined([...graph.getAllNodes()].find((node) => node.name === name))
}

function instanceChildren(graph: SceneGraph, instanceName: string): SceneNode[] {
  const instance = expectDefined(
    [...graph.getAllNodes()].find((node) => node.type === 'INSTANCE' && node.name === instanceName)
  )
  return graph.getChildren(instance.id)
}

/** A button with an icon and a label, and an instance of it named Save. */
function button() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const component = graph.createNode('COMPONENT', pageId, {
    name: 'Button',
    width: 120,
    height: 40
  })
  graph.createNode('RECTANGLE', component.id, { name: 'Icon', x: 8, y: 8, width: 24, height: 24 })
  graph.createNode('RECTANGLE', component.id, { name: 'Label', x: 40, y: 8, width: 60, height: 24 })
  const instance = expectDefined(graph.createInstance(component.id, pageId, { x: 200 }))
  graph.updateNode(instance.id, { name: 'Save' })
  return { graph, pageId, component, instance }
}

describe('a layer replaced inside an instance, saved as .fig', () => {
  test('keeps the replacement in place of the component layer when reopened', async () => {
    const { graph, pageId, instance } = button()
    const star = graph.createNode('STAR', pageId, {
      name: 'Star',
      width: 20,
      height: 20,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    expect(replaceInstanceLayer(graph, graph.getChildren(instance.id)[0].id, star.id)).toBe(true)

    const { reopened } = await reopen(graph)
    const [first, second] = instanceChildren(reopened, 'Save')
    expect(first).toMatchObject({ type: 'STAR', name: 'Star', width: 20, height: 20, x: 8, y: 8 })
    expect(first.fills[0]?.color).toMatchObject({ r: 1, g: 0, b: 0 })
    expect(isReplacedLayer(reopened, first)).toBe(true)
    expect(replacedComponentLayerId(reopened, first)).toBe(named(reopened, 'Icon').id)
    expect(second.name).toBe('Label')
  })

  test('keeps the image a replacement shows', async () => {
    const { graph, pageId, instance } = button()
    const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4])
    // A hash other than the content's, which the save renames as Figma names images.
    const local = 'ab'.repeat(20)
    graph.images.set(local, bytes)
    const picture = graph.createNode('RECTANGLE', pageId, {
      name: 'Picture',
      fills: [
        {
          type: 'IMAGE',
          color: { r: 0, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true,
          imageHash: local,
          imageScaleMode: 'FILL'
        }
      ]
    })
    expect(replaceInstanceLayer(graph, graph.getChildren(instance.id)[0].id, picture.id)).toBe(true)

    const { reopened } = await reopen(graph)
    const [first] = instanceChildren(reopened, 'Save')
    const hash = expectDefined(first.fills[0]?.imageHash)
    expect(hash).not.toBe(local)
    expect(reopened.images.get(hash)).toEqual(bytes)
  })

  test('keeps a replacement with layers of its own', async () => {
    const { graph, pageId, instance } = button()
    const frame = graph.createNode('FRAME', pageId, { name: 'Badge', width: 30, height: 30 })
    graph.createNode('TEXT', frame.id, { name: 'Count', text: '3', width: 10, height: 14 })
    expect(replaceInstanceLayer(graph, graph.getChildren(instance.id)[0].id, frame.id)).toBe(true)

    const { reopened } = await reopen(graph)
    const [badge] = instanceChildren(reopened, 'Save')
    expect(badge).toMatchObject({ type: 'FRAME', name: 'Badge' })
    expect(reopened.getChildren(badge.id).map((node) => [node.type, node.text])).toEqual([
      ['TEXT', '3']
    ])
  })

  test('writes the component layer for Figma and the replacement as plugin data', async () => {
    const { graph, pageId, instance } = button()
    const star = graph.createNode('STAR', pageId, { name: 'Star' })
    replaceInstanceLayer(graph, graph.getChildren(instance.id)[0].id, star.id)

    const { records } = await reopen(graph)
    const saved = expectDefined(records.find((record) => record.name === 'Save'))
    const entry = expectDefined(
      saved.pluginData?.find(
        (data) =>
          data.pluginID === PAIRDRAW_PLUGIN_ID &&
          data.key === PAIRDRAW_PLUGIN_DATA.replacedLayers.key
      )
    )
    expect(PAIRDRAW_PLUGIN_DATA.replacedLayers.decode(entry.value)).toHaveLength(1)
    // The replacement is no record of the file: Figma's instance shows its component.
    expect(records.some((record) => record.name === 'Star')).toBe(false)
  })

  test('keeps a replacement made in a document opened from a .fig file', async () => {
    const { graph } = button()
    const opened = (await reopen(graph)).reopened
    const [icon] = instanceChildren(opened, 'Save')
    const page = expectDefined(opened.getPages()[0]).id
    const star = opened.createNode('STAR', page, { name: 'Star', width: 18, height: 18 })
    expect(replaceInstanceLayer(opened, icon.id, star.id)).toBe(true)

    // The archive is kept, so this save writes only the records the edit changed.
    const bytes = await exportFigFile(opened)
    const reopened = await parseFigFile(bytes.slice().buffer)
    const [first] = instanceChildren(reopened, 'Save')
    expect(first).toMatchObject({ type: 'STAR', name: 'Star', width: 18 })
  })

  test('keeps a replacement inside a nested instance', async () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const { component } = (() => {
      const inner = graph.createNode('COMPONENT', pageId, { name: 'Button', width: 80 })
      graph.createNode('RECTANGLE', inner.id, { name: 'Icon', width: 24, height: 24 })
      return { component: inner }
    })()
    const card = graph.createNode('COMPONENT', pageId, { name: 'Card', width: 200, height: 100 })
    expectDefined(graph.createInstance(component.id, card.id))
    const outer = expectDefined(graph.createInstance(card.id, pageId, { x: 300 }))
    graph.updateNode(outer.id, { name: 'Outer' })
    const nested = graph.getChildren(outer.id)[0]
    const star = graph.createNode('STAR', pageId, { name: 'Star' })
    expect(replaceInstanceLayer(graph, graph.getChildren(nested.id)[0].id, star.id)).toBe(true)

    const { reopened } = await reopen(graph)
    const [reopenedNested] = instanceChildren(reopened, 'Outer')
    const [replaced] = reopened.getChildren(reopenedNested.id)
    expect(replaced).toMatchObject({ type: 'STAR', name: 'Star' })
    expect(isReplacedLayer(reopened, replaced)).toBe(true)
  })
  test.each([
    ['made after the replacement', false],
    ['synced after the replacement', true]
  ])(
    'keeps a replacement in a component, and in an instance of the component %s',
    async (_label, instanceFirst) => {
      const graph = new SceneGraph()
      const pageId = graph.getPages()[0].id
      const inner = graph.createNode('COMPONENT', pageId, { name: 'Button', width: 80 })
      graph.createNode('RECTANGLE', inner.id, { name: 'Icon', width: 24, height: 24 })
      graph.createNode('RECTANGLE', inner.id, { name: 'Label', x: 30, width: 24, height: 24 })
      const card = graph.createNode('COMPONENT', pageId, { name: 'Card', width: 200, height: 100 })
      const nested = expectDefined(graph.createInstance(inner.id, card.id))
      const outerProps = { name: 'Outer', x: 300 }
      const early = instanceFirst ? graph.createInstance(card.id, pageId, outerProps) : null
      const star = graph.createNode('STAR', pageId, { name: 'Star', width: 20, height: 20 })
      expect(replaceInstanceLayer(graph, graph.getChildren(nested.id)[0].id, star.id)).toBe(true)
      if (early) graph.syncInstances(card.id)
      else expectDefined(graph.createInstance(card.id, pageId, outerProps))

      const { reopened } = await reopen(graph)
      const names = (id: string) =>
        reopened.getChildren(id).map((node) => `${node.type}:${node.name}`)
      const [definitionNested] = reopened.getChildren(named(reopened, 'Card').id)
      expect(names(definitionNested.id)).toEqual(['STAR:Star', 'RECTANGLE:Label'])
      expect(isReplacedLayer(reopened, reopened.getChildren(definitionNested.id)[0])).toBe(true)
      const [outerNested] = instanceChildren(reopened, 'Outer')
      expect(names(outerNested.id)).toEqual(['STAR:Star', 'RECTANGLE:Label'])
      // The instance shows the component's replacement as it shows its other layers.
      const copy = reopened.getChildren(outerNested.id)[0]
      expect(isReplacedLayer(reopened, copy)).toBe(false)

      // And saves again as it was opened.
      const again = (await reopen(reopened)).reopened
      const [againNested] = instanceChildren(again, 'Outer')
      expect(again.getChildren(againNested.id).map((node) => node.type)).toEqual([
        'STAR',
        'RECTANGLE'
      ])
    }
  )
})
