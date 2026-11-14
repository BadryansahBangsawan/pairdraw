import { describe, expect, test } from 'bun:test'

import { expectDefined, getNodeOrThrow } from '#core-tests/helpers/assert'

import { createEditor, editedImage, imageEditChanges, type Editor } from '@pairdraw/core'
import { imageCropQuad } from '@pairdraw/core/geometry'
import type { Fill, SceneNode } from '@pairdraw/scene-graph'
import { getWorldMatrix } from '@pairdraw/scene-graph/coordinate'
import { coverImageTransform } from '@pairdraw/scene-graph/images'
import Matrix from '@pairdraw/scene-graph/matrix'
import type { Vector } from '@pairdraw/scene-graph/primitives'

/** A PNG header declaring a `width` × `height` image, which is all the crop reads of it. */
function pngHeader(width: number, height: number): Uint8Array {
  const header = new Uint8Array(33)
  const view = new DataView(header.buffer)
  header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  view.setUint32(16, width)
  view.setUint32(20, height)
  header.set([8, 6], 24)
  return header
}

function imageFill(imageHash: string, mode: Fill['imageScaleMode'] = 'FILL'): Fill {
  return {
    type: 'IMAGE',
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
    imageHash,
    imageScaleMode: mode
  }
}

/** A 200 × 100 rectangle at (40, 60) filled with a 400 × 300 image. */
function setup(fill: Partial<Fill> = {}, node: Partial<SceneNode> = {}) {
  const editor = createEditor()
  const page = expectDefined(editor.graph.getPages()[0], 'page')
  editor.graph.images.set('photo', pngHeader(400, 300))
  const rect = editor.graph.createNode('RECTANGLE', page.id, {
    x: 40,
    y: 60,
    width: 200,
    height: 100,
    fills: [{ ...imageFill('photo'), ...fill }],
    ...node
  })
  return { editor, rect, page }
}

/** Where the image's corners are on the canvas. */
function imageCorners(editor: Editor, nodeId: string): Vector[] {
  const node = getNodeOrThrow(editor.graph, nodeId)
  const edited = expectDefined(editedImage(editor.graph, { nodeId, index: 0 }), 'edited image')
  const quad = expectDefined(imageCropQuad(edited.transform, node.width, node.height), 'quad')
  const world = getWorldMatrix(node, editor.graph)
  return quad.map((point) => Matrix.mapPoint(world, point))
}

function closePoints(actual: Vector[], expected: Vector[]) {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((point, index) => {
    expect(point.x).toBeCloseTo(expected[index].x, 4)
    expect(point.y).toBeCloseTo(expected[index].y, 4)
  })
}

describe('image edit mode', () => {
  test('opens on a layer showing an image, selecting it, without an undo step', () => {
    const { editor, rect } = setup()
    expect(editor.canEditImage(rect.id)).toBe(true)
    expect(editor.startImageEdit(rect.id)).toBe(true)
    expect(editor.state.imageEdit).toEqual({ nodeId: rect.id, index: 0 })
    expect([...editor.state.selectedIds]).toEqual([rect.id])
    expect(editor.undo.canUndo).toBe(false)
    // Fill draws exactly as the crop that covers the layer, which the first change stores.
    const edited = expectDefined(editedImage(editor.graph, editor.state.imageEdit), 'edited')
    const cover = coverImageTransform(200, 100, 400, 300)
    for (const key of ['m00', 'm01', 'm02', 'm10', 'm11', 'm12'] as const)
      expect(edited.transform[key]).toBeCloseTo(cover[key], 6)
  })

  test('turns Fit into the covering crop as one undo step', () => {
    const { editor, rect } = setup({ imageScaleMode: 'FIT' })
    editor.startImageEdit(rect.id)
    const fill = expectDefined(getNodeOrThrow(editor.graph, rect.id).fills[0], 'fill')
    expect(fill.imageScaleMode).toBe('CROP')
    editor.undoAction()
    expect(getNodeOrThrow(editor.graph, rect.id).fills[0]?.imageScaleMode).toBe('FIT')
  })

  test('is not offered without an image, on a locked layer, or in a read-only document', () => {
    const { editor, rect, page } = setup()
    const plain = editor.graph.createNode('RECTANGLE', page.id, { width: 10, height: 10 })
    expect(editor.canEditImage(plain.id)).toBe(false)
    expect(editor.startImageEdit(plain.id)).toBe(false)
    editor.updateNode(rect.id, { locked: true })
    expect(editor.canEditImage(rect.id)).toBe(false)
    editor.updateNode(rect.id, { locked: false })
    editor.setReadOnly(true)
    expect(editor.canEditImage(rect.id)).toBe(false)
  })

  test('is not offered inside a read-only library definition', () => {
    const { editor, page } = setup()
    const component = editor.graph.createNode('COMPONENT', page.id, {
      width: 200,
      height: 100,
      librarySource: {
        identity: { libraryId: 'design-system', assetKey: 'card', revisionId: 'r1' },
        sourceNodeId: 'source',
        readOnly: true
      }
    })
    const image = editor.graph.createNode('RECTANGLE', component.id, {
      width: 200,
      height: 100,
      fills: [imageFill('photo', 'FIT')]
    })
    expect(editor.canEditImage(image.id)).toBe(false)
    expect(editor.startImageEdit(image.id)).toBe(false)
    expect(editor.state.imageEdit).toBeNull()
    expect(getNodeOrThrow(editor.graph, image.id).fills[0]?.imageScaleMode).toBe('FIT')
  })

  test('edits the image fill it is asked for, and only a visible one', () => {
    const { editor, rect } = setup()
    editor.updateNode(rect.id, {
      fills: [imageFill('photo'), { ...imageFill('photo'), visible: false }, imageFill('photo')]
    })
    expect(editor.canEditImage(rect.id, 1)).toBe(false)
    expect(editor.startImageEdit(rect.id, 1)).toBe(false)
    expect(editor.startImageEdit(rect.id, 0)).toBe(true)
    expect(editor.state.imageEdit).toEqual({ nodeId: rect.id, index: 0 })
    editor.endImageEdit()
    expect(editor.startImageEdit(rect.id)).toBe(true)
    expect(editor.state.imageEdit).toEqual({ nodeId: rect.id, index: 2 })
  })

  test('ends when the layer is locked or its image stops being a crop', () => {
    const { editor, rect } = setup()
    editor.startImageEdit(rect.id)
    editor.updateNodeWithUndo(rect.id, { locked: true }, 'Lock')
    expect(editor.state.imageEdit).toBeNull()
    expect(editor.canEditImage(rect.id)).toBe(false)

    const fit = setup({ imageScaleMode: 'FIT' })
    fit.editor.startImageEdit(fit.rect.id)
    expect(fit.editor.state.imageEdit).not.toBeNull()
    // Undoing the turn into a crop puts Fit back, which the crop handles would not frame.
    fit.editor.undoAction()
    expect(getNodeOrThrow(fit.editor.graph, fit.rect.id).fills[0]?.imageScaleMode).toBe('FIT')
    expect(fit.editor.state.imageEdit).toBeNull()
  })

  test('ends when the selection, tool, or document changes', () => {
    const { editor, rect, page } = setup()
    const other = editor.graph.createNode('RECTANGLE', page.id, { width: 10, height: 10 })
    editor.startImageEdit(rect.id)
    editor.select([other.id])
    expect(editor.state.imageEdit).toBeNull()

    editor.startImageEdit(rect.id)
    editor.setTool('RECTANGLE')
    expect(editor.state.imageEdit).toBeNull()

    editor.startImageEdit(rect.id)
    editor.setReadOnly(true)
    expect(editor.state.imageEdit).toBeNull()
  })

  test('cropping an edge moves the layer over the image, which stays put', () => {
    const { editor, rect } = setup()
    editor.startImageEdit(rect.id)
    const before = imageCorners(editor, rect.id)
    const edited = expectDefined(editedImage(editor.graph, editor.state.imageEdit), 'edited')
    const changes = imageEditChanges(
      edited,
      { kind: 'crop', handle: 'w' },
      { x: 0, y: 50 },
      { x: 50, y: 50 }
    )
    expect(changes).toMatchObject({ x: 90, y: 60, width: 150, height: 100 })
    editor.updateNodeWithUndo(rect.id, changes, 'Crop image')
    closePoints(imageCorners(editor, rect.id), before)
    expect(getNodeOrThrow(editor.graph, rect.id).fills[0]?.imageScaleMode).toBe('CROP')
  })

  test('cropping a turned layer keeps the image where it is on the canvas', () => {
    const { editor, rect } = setup({}, { rotation: 30 })
    editor.startImageEdit(rect.id)
    const before = imageCorners(editor, rect.id)
    const edited = expectDefined(editedImage(editor.graph, editor.state.imageEdit), 'edited')
    const changes = imageEditChanges(
      edited,
      { kind: 'crop', handle: 'se' },
      { x: 200, y: 100 },
      { x: 150, y: 70 }
    )
    editor.updateNodeWithUndo(rect.id, changes, 'Crop image')
    const node = getNodeOrThrow(editor.graph, rect.id)
    expect(node.width).toBeCloseTo(150, 6)
    expect(node.height).toBeCloseTo(70, 6)
    closePoints(imageCorners(editor, rect.id), before)
  })

  test('moving the image keeps the layer and stores the new framing', () => {
    const { editor, rect } = setup()
    editor.startImageEdit(rect.id)
    const edited = expectDefined(editedImage(editor.graph, editor.state.imageEdit), 'edited')
    const changes = imageEditChanges(edited, { kind: 'pan' }, { x: 100, y: 50 }, { x: 140, y: 60 })
    expect(Object.keys(changes)).toEqual(['fills'])
    editor.updateNodeWithUndo(rect.id, changes, 'Reframe image')
    // Flush left and right already; 10 px of the 25 to spare above.
    closePoints(imageCorners(editor, rect.id).slice(0, 1), [{ x: 40, y: 60 - 15 }])
  })

  test('a layer auto layout places reframes its image but keeps its edges', () => {
    const { editor, page } = setup()
    const row = editor.graph.createNode('FRAME', page.id, {
      width: 400,
      height: 200,
      layoutMode: 'HORIZONTAL',
      paddingLeft: 12,
      paddingTop: 12
    })
    const image = editor.graph.createNode('RECTANGLE', row.id, {
      width: 200,
      height: 100,
      fills: [imageFill('photo')]
    })
    editor.startImageEdit(image.id)
    const edited = expectDefined(editedImage(editor.graph, editor.state.imageEdit), 'edited')
    expect(edited.croppable).toBe(false)
    expect(
      imageEditChanges(edited, { kind: 'crop', handle: 'w' }, { x: 0, y: 50 }, { x: 50, y: 50 })
    ).toEqual({})

    // Taken out of the flow, the layer keeps the place a crop gives it.
    editor.updateNode(image.id, { layoutPositioning: 'ABSOLUTE' })
    const absolute = expectDefined(editedImage(editor.graph, editor.state.imageEdit), 'absolute')
    expect(absolute.croppable).toBe(true)
  })

  test('a layer with children reframes its image but keeps its edges', () => {
    const { editor, page } = setup()
    const frame = editor.graph.createNode('FRAME', page.id, {
      width: 200,
      height: 100,
      fills: [imageFill('photo')]
    })
    editor.graph.createNode('RECTANGLE', frame.id, { width: 10, height: 10 })
    editor.startImageEdit(frame.id)
    const edited = expectDefined(editedImage(editor.graph, editor.state.imageEdit), 'edited')
    expect(edited.croppable).toBe(false)
    expect(
      imageEditChanges(edited, { kind: 'crop', handle: 'e' }, { x: 200, y: 50 }, { x: 100, y: 50 })
    ).toEqual({})
  })
})
