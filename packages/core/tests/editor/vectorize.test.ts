import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import {
  svgToVectorPaths,
  VECTORIZE_RESULT_GAP,
  vectorizableImageFill
} from '@open-pencil/core/vector'
import type { Fill } from '@open-pencil/scene-graph'

import { expectDefined, getNodeOrThrow } from '../helpers/assert'

const GAP = VECTORIZE_RESULT_GAP

function imageFill(imageHash: string, visible = true): Fill {
  return {
    type: 'IMAGE',
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible,
    imageHash,
    imageScaleMode: 'FILL'
  }
}

function vectorizedInset() {
  return expectDefined(
    svgToVectorPaths(
      `<svg viewBox="0 0 100 100"><path d="M25 10 H75 V90 H25 Z" fill="#336699"/></svg>`,
      { width: 200, height: 100 }
    ),
    'vectorized SVG'
  )
}

function vectorizedFull(width: number, height: number) {
  return expectDefined(
    svgToVectorPaths(
      `<svg viewBox="0 0 100 100"><path d="M0 0 H100 V100 H0 Z" fill="#336699"/></svg>`,
      { width, height }
    ),
    'vectorized SVG'
  )
}

describe('addVectorFrameBeside', () => {
  test('keeps the image and adds the vectors beside it, as one undo step', () => {
    const editor = createEditor()
    const page = expectDefined(editor.graph.getPages()[0], 'page')
    const source = editor.graph.createNode('RECTANGLE', page.id, {
      name: 'Photo',
      x: 40,
      y: 60,
      width: 200,
      height: 100,
      opacity: 0.75,
      cornerRadius: 12,
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.3 },
          offset: { x: 0, y: 4 },
          radius: 8,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
    })
    editor.select([source.id])

    const frameId = expectDefined(
      editor.addVectorFrameBeside(source.id, vectorizedInset()),
      'vector frame'
    )
    const frame = getNodeOrThrow(editor.graph, frameId)
    expect(frame.type).toBe('FRAME')
    // The inset content keeps its offset inside the original's box, moved one box and a gap right.
    expect(frame).toMatchObject({
      x: 90 + 200 + GAP,
      y: 70,
      width: 100,
      height: 80,
      opacity: 0.75,
      cornerRadius: 12,
      clipsContent: true
    })
    expect(frame.effects).toHaveLength(1)
    expect(frame.childIds).toHaveLength(1)
    expect(getNodeOrThrow(editor.graph, source.id)).toMatchObject({ x: 40, y: 60, width: 200 })
    expect(page.childIds).toEqual([source.id, frameId])
    expect([...editor.state.selectedIds]).toEqual([frameId])

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, source.id).type).toBe('RECTANGLE')
    expect(editor.graph.getNode(frameId)).toBeUndefined()
    expect([...editor.state.selectedIds]).toEqual([source.id])

    editor.undo.redo()
    expect(getNodeOrThrow(editor.graph, frameId).type).toBe('FRAME')
    expect(getNodeOrThrow(editor.graph, source.id).type).toBe('RECTANGLE')
    expect(page.childIds).toEqual([source.id, frameId])
    expect([...editor.state.selectedIds]).toEqual([frameId])
  })

  test('leaves out paths the SVG hides', () => {
    const editor = createEditor()
    const page = expectDefined(editor.graph.getPages()[0], 'page')
    const source = editor.graph.createNode('RECTANGLE', page.id, { width: 100, height: 100 })
    const vectorized = expectDefined(
      svgToVectorPaths(
        `<svg viewBox="0 0 100 100">
          <path d="M0 0 H100 V100 H0 Z" visibility="hidden"/>
          <path d="M25 25 H75 V75 H25 Z" fill="#336699"/>
        </svg>`,
        { width: 100, height: 100 }
      ),
      'vectorized SVG'
    )

    const frameId = expectDefined(
      editor.addVectorFrameBeside(source.id, vectorized),
      'vector frame'
    )
    const frame = getNodeOrThrow(editor.graph, frameId)
    expect(frame).toMatchObject({ x: 25 + 100 + GAP, y: 25, width: 50, height: 50 })
    expect(frame.childIds).toHaveLength(1)
  })

  test('keeps the coordinate box and rotation of rotated images', () => {
    const editor = createEditor()
    const page = expectDefined(editor.graph.getPages()[0], 'page')
    const source = editor.graph.createNode('RECTANGLE', page.id, {
      x: 40,
      y: 60,
      width: 200,
      height: 100,
      rotation: 30
    })

    const frameId = expectDefined(
      editor.addVectorFrameBeside(source.id, vectorizedInset()),
      'vector frame'
    )
    const frame = getNodeOrThrow(editor.graph, frameId)
    expect(frame).toMatchObject({ y: 60, width: 200, height: 100, rotation: 30 })
    expect(frame.x).toBeGreaterThan(40 + 200)
  })

  test('steps past layers already to the right of the image', () => {
    const editor = createEditor()
    const page = expectDefined(editor.graph.getPages()[0], 'page')
    const source = editor.graph.createNode('RECTANGLE', page.id, {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })
    editor.graph.createNode('RECTANGLE', page.id, { x: 150, y: 20, width: 60, height: 60 })

    const frameId = expectDefined(
      editor.addVectorFrameBeside(source.id, vectorizedFull(100, 100)),
      'vector frame'
    )
    expect(getNodeOrThrow(editor.graph, frameId)).toMatchObject({ x: 210 + GAP, y: 0 })
  })

  test('goes beside an auto-layout frame, leaving its layout as it was', () => {
    const editor = createEditor()
    const page = expectDefined(editor.graph.getPages()[0], 'page')
    const stack = editor.graph.createNode('FRAME', page.id, {
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      layoutMode: 'HORIZONTAL'
    })
    const source = editor.graph.createNode('RECTANGLE', stack.id, { width: 100, height: 100 })
    const after = editor.graph.createNode('RECTANGLE', stack.id, { x: 100, width: 50, height: 50 })

    const frameId = expectDefined(
      editor.addVectorFrameBeside(source.id, vectorizedFull(100, 100)),
      'vector frame'
    )
    const frame = getNodeOrThrow(editor.graph, frameId)
    expect(frame.parentId).toBe(page.id)
    expect(frame).toMatchObject({ x: 400 + GAP, y: 0, width: 100, height: 100 })
    expect(getNodeOrThrow(editor.graph, stack.id)).toMatchObject({ width: 400, height: 200 })
    expect(getNodeOrThrow(editor.graph, stack.id).childIds).toEqual([source.id, after.id])
    expect(getNodeOrThrow(editor.graph, after.id).x).toBe(100)
  })

  test('goes beside a group or boolean that holds the image, leaving its shape as it was', () => {
    for (const type of ['GROUP', 'BOOLEAN_OPERATION'] as const) {
      const editor = createEditor()
      const page = expectDefined(editor.graph.getPages()[0], 'page')
      const holder = editor.graph.createNode(type, page.id, { width: 100, height: 300 })
      const source = editor.graph.createNode('RECTANGLE', holder.id, { width: 100, height: 100 })
      const other = editor.graph.createNode('RECTANGLE', holder.id, {
        y: 200,
        width: 100,
        height: 100
      })

      const frameId = expectDefined(
        editor.addVectorFrameBeside(source.id, vectorizedFull(100, 100)),
        'vector frame'
      )
      const frame = getNodeOrThrow(editor.graph, frameId)
      expect(frame.parentId).toBe(page.id)
      expect(frame).toMatchObject({ x: 100 + GAP, y: 0, width: 100, height: 100 })
      expect(getNodeOrThrow(editor.graph, holder.id)).toMatchObject({ width: 100, height: 300 })
      expect(getNodeOrThrow(editor.graph, holder.id).childIds).toEqual([source.id, other.id])
      expect(page.childIds).toEqual([holder.id, frameId])
    }
  })

  test('goes beside a component that holds the image, so its instances stay as they were', () => {
    const editor = createEditor()
    const page = expectDefined(editor.graph.getPages()[0], 'page')
    const component = editor.graph.createNode('COMPONENT', page.id, { width: 200, height: 200 })
    const source = editor.graph.createNode('RECTANGLE', component.id, {
      x: 20,
      y: 20,
      width: 100,
      height: 100
    })

    const frameId = expectDefined(
      editor.addVectorFrameBeside(source.id, vectorizedFull(100, 100)),
      'vector frame'
    )
    expect(getNodeOrThrow(editor.graph, frameId).parentId).toBe(page.id)
    expect(getNodeOrThrow(editor.graph, frameId)).toMatchObject({ x: 200 + GAP, y: 20 })
    expect(getNodeOrThrow(editor.graph, component.id).childIds).toEqual([source.id])
  })

  test('stays out of reach of masks at or below the image', () => {
    const editor = createEditor()
    const page = expectDefined(editor.graph.getPages()[0], 'page')
    const board = editor.graph.createNode('FRAME', page.id, { width: 600, height: 400 })
    const mask = editor.graph.createNode('RECTANGLE', board.id, {
      width: 100,
      height: 100,
      isMask: true
    })
    const masked = editor.graph.createNode('RECTANGLE', board.id, { width: 100, height: 100 })

    const fromMask = expectDefined(
      editor.addVectorFrameBeside(mask.id, vectorizedFull(100, 100)),
      'vector frame for the mask'
    )
    expect(getNodeOrThrow(editor.graph, board.id).childIds).toEqual([fromMask, mask.id, masked.id])

    const fromMasked = expectDefined(
      editor.addVectorFrameBeside(masked.id, vectorizedFull(100, 100)),
      'vector frame for the masked image'
    )
    expect(getNodeOrThrow(editor.graph, board.id).childIds).toEqual([
      fromMask,
      fromMasked,
      mask.id,
      masked.id
    ])
  })

  test('goes on the page beside a clipping frame that holds the image', () => {
    const editor = createEditor()
    const page = expectDefined(editor.graph.getPages()[0], 'page')
    const card = editor.graph.createNode('FRAME', page.id, {
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      clipsContent: true
    })
    const source = editor.graph.createNode('RECTANGLE', card.id, {
      x: 20,
      y: 30,
      width: 120,
      height: 80
    })

    const frameId = expectDefined(
      editor.addVectorFrameBeside(source.id, vectorizedFull(120, 80)),
      'vector frame'
    )
    const frame = getNodeOrThrow(editor.graph, frameId)
    expect(frame.parentId).toBe(page.id)
    expect(frame).toMatchObject({ x: 400 + GAP, y: 130, width: 120, height: 80 })
    expect(getNodeOrThrow(editor.graph, card.id).childIds).toEqual([source.id])

    editor.undo.undo()
    expect(editor.graph.getNode(frameId)).toBeUndefined()
    expect(page.childIds).toEqual([card.id])
  })
})

describe('vectorizableImageFill', () => {
  test('finds the topmost visible image fill on a layer of any kind', () => {
    const editor = createEditor()
    const page = expectDefined(editor.graph.getPages()[0], 'page')
    const frame = editor.graph.createNode('FRAME', page.id, {
      fills: [imageFill('bottom'), imageFill('top'), imageFill('hidden', false)]
    })
    editor.graph.createNode('TEXT', frame.id, { text: 'Child' })
    const ellipse = editor.graph.createNode('ELLIPSE', page.id, { fills: [imageFill('round')] })

    expect(vectorizableImageFill(frame)?.imageHash).toBe('top')
    expect(vectorizableImageFill(ellipse)?.imageHash).toBe('round')
  })

  test('has nothing for layers without a visible image', () => {
    const editor = createEditor()
    const page = expectDefined(editor.graph.getPages()[0], 'page')
    const hidden = editor.graph.createNode('RECTANGLE', page.id, {
      fills: [imageFill('hidden', false)]
    })
    const solid = editor.graph.createNode('RECTANGLE', page.id)

    expect(vectorizableImageFill(hidden)).toBeNull()
    expect(vectorizableImageFill(solid)).toBeNull()
    expect(vectorizableImageFill(page)).toBeNull()
  })
})
