import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core'
import type { SceneNode } from '@pairdraw/scene-graph'
import { readVariationSet } from '@pairdraw/scene-graph/variations'

function setup() {
  const editor = createEditor()
  const pageId = editor.graph.getPages()[0].id
  const screen = editor.graph.createNode('FRAME', pageId, {
    name: 'Screen',
    x: 0,
    y: 0,
    width: 400,
    height: 800,
    layoutMode: 'VERTICAL',
    variableModes: { theme: 'dark' }
  })
  const card = editor.graph.createNode('FRAME', screen.id, {
    name: 'Card',
    width: 300,
    height: 100
  })
  editor.graph.createNode('TEXT', card.id, { name: 'Title', text: 'Hello' })
  editor.graph.createNode('FRAME', screen.id, { name: 'Footer', width: 300, height: 50 })
  return { editor, pageId, screen, card }
}

/** Whether two top-level layers cover any of the same area. */
function overlap(a: SceneNode, b: SceneNode): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

/** Every pair of top-level layers on the page that overlap, by name. */
function overlaps(editor: ReturnType<typeof createEditor>, pageId: string): string[] {
  const layers = editor.graph.getChildren(pageId)
  return layers.flatMap((a, index) =>
    layers.slice(index + 1).flatMap((b) => (overlap(a, b) ? [`${a.name} × ${b.name}`] : []))
  )
}

describe('variations in the editor', () => {
  test('copies sit in a marked section beside the top-level layer, named by their labels', () => {
    const { editor, pageId, screen, card } = setup()
    const created = editor.createVariations(card.id, { count: 2, labels: ['Calmer'] })

    const section = getNodeOrThrow(editor.graph, created.sectionId)
    expect(section).toMatchObject({ type: 'SECTION', parentId: pageId, name: 'Variations · Card' })
    expect(section.x).toBeGreaterThanOrEqual(screen.x + screen.width)
    expect(section.variableModes).toEqual({ theme: 'dark' })
    expect(readVariationSet(section)?.originalId).toBe(card.id)
    expect(created.versions.map((version) => version.name)).toEqual(['V1 · Calmer', 'V2'])
    const [first, second] = created.versions
    expect(first).toMatchObject({ type: 'FRAME', parentId: section.id, x: 80, y: 80 })
    expect(second.x).toBe(first.x + first.width + 80)
    expect(section.width).toBe(second.x + second.width + 80)
    // The original is left as it was.
    expect(getNodeOrThrow(editor.graph, card.id).parentId).toBe(screen.id)
  })

  test('a new set goes where it covers no other layer', () => {
    const { editor, pageId, card } = setup()
    editor.graph.createNode('FRAME', pageId, {
      name: 'Neighbour',
      x: 480,
      y: 0,
      width: 600,
      height: 300
    })
    editor.createVariations(card.id, { count: 3 })
    expect(overlaps(editor, pageId)).toEqual([])
  })

  test('a set that grows moves rather than cover a layer beside it', () => {
    const { editor, pageId, card } = setup()
    const { sectionId } = editor.createVariations(card.id, { count: 1 })
    const section = getNodeOrThrow(editor.graph, sectionId)
    editor.graph.createNode('FRAME', pageId, {
      name: 'Neighbour',
      x: section.x + section.width + 10,
      y: section.y,
      width: 300,
      height: 300
    })

    const { versions } = editor.createVariations(card.id, { count: 2 })

    expect(overlaps(editor, pageId)).toEqual([])
    const grown = getNodeOrThrow(editor.graph, sectionId)
    // Every version still fits inside the section.
    for (const version of editor.graph.getChildren(sectionId)) {
      expect(version.x + version.width).toBeLessThanOrEqual(grown.width)
    }
    expect(versions).toHaveLength(2)
  })

  test('a set with room to grow stays where it is', () => {
    const { editor, card } = setup()
    const { sectionId } = editor.createVariations(card.id, { count: 1 })
    const { x, y } = getNodeOrThrow(editor.graph, sectionId)
    editor.createVariations(card.id, { count: 2 })
    expect(getNodeOrThrow(editor.graph, sectionId)).toMatchObject({ x, y })
  })

  test('asking again, or on a version, adds to the same set', () => {
    const { editor, card } = setup()
    const first = editor.createVariations(card.id, { count: 1 })
    const again = editor.createVariations(card.id, { count: 1 })
    const fromVersion = editor.createVariations(first.versions[0].id, { count: 1 })
    expect(again.sectionId).toBe(first.sectionId)
    expect(fromVersion.sectionId).toBe(first.sectionId)
    expect(editor.graph.getChildren(first.sectionId).map((node) => node.name)).toEqual([
      'V1',
      'V2',
      'V3'
    ])
  })

  test('a main component is copied as frames, and an instance as instances', () => {
    const { editor, pageId } = setup()
    const button = editor.graph.createNode('COMPONENT', pageId, { name: 'Button', x: 2000 })
    const instance = editor.graph.createInstance(button.id, pageId, { x: 3000 })
    if (!instance) throw new Error('no instance')

    const [buttonCopy] = editor.createVariations(button.id, { count: 1 }).versions
    const [instanceCopy] = editor.createVariations(instance.id, { count: 1 }).versions
    expect(buttonCopy.type).toBe('FRAME')
    expect(buttonCopy.componentKey).toBeNull()
    expect(instanceCopy).toMatchObject({ type: 'INSTANCE', componentId: button.id })
  })

  test('refuses pages, sections, layers inside instances, and requests out of range', () => {
    const { editor, pageId, card } = setup()
    expect(() => editor.createVariations(pageId, { count: 2 })).toThrow('A page cannot be varied')
    const { sectionId } = editor.createVariations(card.id, { count: 1 })
    expect(() => editor.createVariations(sectionId, { count: 1 })).toThrow('section')
    expect(() => editor.createVariations(card.id, { count: 9 })).toThrow('1 to 8')
    expect(() => editor.createVariations(card.id, { count: 0 })).toThrow('1 to 8')
    expect(() => editor.createVariations(card.id, { count: 1, labels: ['a', 'b'] })).toThrow(
      '2 labels for 1 versions'
    )
    const button = editor.graph.createNode('COMPONENT', pageId, { name: 'Button' })
    editor.graph.createNode('TEXT', button.id, { name: 'Label' })
    const instance = editor.graph.createInstance(button.id, pageId)
    if (!instance) throw new Error('no instance')
    const inner = editor.graph.getChildren(instance.id)[0]
    expect(() => editor.createVariations(inner.id, { count: 1 })).toThrow('inside an instance')
  })

  test('refuses a request that copies too many layers', () => {
    const { editor, pageId } = setup()
    const big = editor.graph.createNode('FRAME', pageId, { name: 'Big' })
    for (let index = 0; index < 1300; index++) {
      editor.graph.createNode('RECTANGLE', big.id, { name: `R${index}` })
    }
    expect(() => editor.createVariations(big.id, { count: 8 })).toThrow('more than the 10000')
  })

  test('using a version is one undo step that keeps the original in its auto layout slot', () => {
    const { editor, screen, card } = setup()
    const { sectionId, versions } = editor.createVariations(card.id, { count: 2 })
    editor.graph.updateNode(versions[1].id, { height: 160, cornerRadius: 16 })

    expect(editor.pickVariation(versions[1].id)).toBe(card.id)

    expect(getNodeOrThrow(editor.graph, card.id)).toMatchObject({
      parentId: screen.id,
      name: 'Card',
      height: 160,
      cornerRadius: 16
    })
    expect(screen.childIds[0]).toBe(card.id)
    expect(editor.graph.getNode(sectionId)).toBeUndefined()
    expect([...editor.state.selectedIds]).toEqual([card.id])

    editor.undoAction()
    expect(getNodeOrThrow(editor.graph, card.id)).toMatchObject({ height: 100, cornerRadius: 0 })
    expect(editor.graph.getNode(sectionId)).toBeDefined()
    expect(editor.graph.getNode(versions[1].id)).toBeDefined()

    editor.redoAction()
    expect(getNodeOrThrow(editor.graph, card.id).cornerRadius).toBe(16)
    expect(editor.graph.getNode(sectionId)).toBeUndefined()
  })

  test('using a version of a frame holding a main component keeps the component and its instances', () => {
    const { editor, pageId } = setup()
    const kit = editor.graph.createNode('FRAME', pageId, { name: 'Kit', x: 3000 })
    const button = editor.graph.createNode('COMPONENT', kit.id, { name: 'Button' })
    const outside = editor.graph.createInstance(button.id, pageId, { x: 5000 })
    if (!outside) throw new Error('no instance')
    const { versions } = editor.createVariations(kit.id, { count: 1 })

    editor.pickVariation(versions[0].id)
    expect(getNodeOrThrow(editor.graph, button.id)).toMatchObject({
      type: 'COMPONENT',
      parentId: kit.id
    })
    expect(editor.graph.getInstances(button.id).map((node) => node.id)).toEqual([outside.id])

    editor.undoAction()
    expect(getNodeOrThrow(editor.graph, button.id).type).toBe('COMPONENT')
    expect(editor.graph.getNode(versions[0].id)).toBeDefined()
    editor.redoAction()
    expect(getNodeOrThrow(editor.graph, button.id).parentId).toBe(kit.id)
    expect(editor.graph.getInstances(button.id).map((node) => node.id)).toEqual([outside.id])
  })

  test('discarding removes every version in one undo step', () => {
    const { editor, card } = setup()
    const { sectionId, versions } = editor.createVariations(card.id, { count: 3 })
    expect(editor.discardVariations(versions[0].id)).toBe(card.id)
    expect(editor.graph.getNode(sectionId)).toBeUndefined()
    editor.undoAction()
    expect(editor.graph.getChildren(sectionId)).toHaveLength(3)
  })

  test('duplicate as variation makes one plain copy and selects it', () => {
    const { editor, card } = setup()
    const { versions } = editor.duplicateAsVariation(card.id)
    expect(versions).toHaveLength(1)
    expect([...editor.state.selectedIds]).toEqual([versions[0].id])
  })

  test('the set reads from any layer in it, with what stops a pick', () => {
    const { editor, card } = setup()
    const { sectionId, versions } = editor.createVariations(card.id, { count: 1 })
    const inner = editor.graph.getChildren(versions[0].id)[0]

    expect(editor.getVariationSet(inner.id)).toMatchObject({
      version: { id: versions[0].id },
      pickProblem: null
    })
    expect(editor.getVariationSet(sectionId)?.pickProblem).toBe('not-a-version')
    expect(editor.getVariationSet(card.id)).toBeNull()
  })

  test('whether the original changed is read on demand, and new versions start afresh', () => {
    const { editor, card } = setup()
    const { sectionId } = editor.createVariations(card.id, { count: 1 })
    expect(editor.isVariationOriginalChanged(sectionId)).toBe(false)
    editor.graph.updateNode(card.id, { width: 320 })
    expect(editor.isVariationOriginalChanged(sectionId)).toBe(true)
    editor.createVariations(card.id, { count: 1 })
    expect(editor.isVariationOriginalChanged(sectionId)).toBe(false)
  })

  test('an original a library owns cannot be replaced', () => {
    const { editor, card } = setup()
    const { versions } = editor.createVariations(card.id, { count: 1 })
    editor.graph.updateNode(card.id, {
      librarySource: {
        identity: { libraryId: 'lib', assetKey: 'asset', revisionId: 'r1' },
        sourceNodeId: null,
        readOnly: true
      }
    })
    expect(editor.getVariationSet(versions[0].id)?.pickProblem).toBe('original-not-editable')
    expect(() => editor.pickVariation(versions[0].id)).toThrow()
    expect(editor.graph.getNode(versions[0].id)).toBeDefined()
  })

  test('a read-only document reads sets but refuses to change them', () => {
    const { editor, card } = setup()
    const { versions } = editor.createVariations(card.id, { count: 1 })
    editor.setReadOnly(true)
    expect(editor.getVariationSet(versions[0].id)).not.toBeNull()
    expect(() => editor.pickVariation(versions[0].id)).toThrow()
    expect(() => editor.duplicateAsVariation(card.id)).toThrow()
  })
})
