import { describe, expect, test } from 'bun:test'

import {
  createEditor,
  findShaderModeTarget,
  ReadOnlyDocumentError,
  resolveEditorProfile
} from '@pairdraw/core'
import { expectDefined } from '#core-tests/helpers/assert'
import { SceneGraph, type Fill, type SceneNode } from '@pairdraw/scene-graph'
import { colorToFill } from '@pairdraw/scene-graph/color'
import {
  isShaderPresetPaint,
  shaderOfPaint,
  type ShaderPreset
} from '@pairdraw/scene-graph/shaders'

/** The preset the paint draws, failing when its shader is user code instead. */
function presetOf(node: Pick<SceneNode, 'pluginData'>, paint: Fill): ShaderPreset {
  const shader = shaderOfPaint(node, paint)
  if (!shader || !isShaderPresetPaint(shader)) throw new Error('paint draws no preset')
  return shader.preset
}

const AURORA: ShaderPreset = { components: [{ type: 'Aurora' }] }
const SWIRL: ShaderPreset = { components: [{ type: 'Swirl' }] }
const RED = { r: 1, g: 0, b: 0, a: 1 }

function setup() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const shaded = graph.createNode('RECTANGLE', pageId, {
    name: 'Hero',
    width: 400,
    height: 200,
    fills: [colorToFill(RED), colorToFill(RED)],
    strokes: []
  })
  const plain = graph.createNode('RECTANGLE', pageId, {
    width: 40,
    height: 40,
    fills: [colorToFill(RED)]
  })
  const editor = createEditor({ graph })
  // The bottom fill becomes a shader, which Shader Mode still finds under a plain fill.
  editor.setShaderPaint([shaded.id], 'fills', 0, AURORA)
  const read = () => {
    const node = editor.graph.getNode(shaded.id)
    if (!node) throw new Error('missing node')
    return node
  }
  return { editor, shaded: shaded.id, plain: plain.id, read }
}

describe('Shader Mode', () => {
  test('finds a layer’s shader paint, where it sits, and the layer’s size', () => {
    const { editor, shaded, plain, read } = setup()
    const image = read().fills[0].imageHash

    expect(findShaderModeTarget(editor.graph, shaded)).toEqual({
      nodeId: shaded,
      image: image ?? '',
      list: 'fills',
      index: 0,
      preset: AURORA,
      name: 'Hero',
      width: 400,
      height: 200
    })
    expect(findShaderModeTarget(editor.graph, plain)).toBeNull()
    expect(findShaderModeTarget(editor.graph, shaded, 'another-image')).toBeNull()
  })

  test('prefers the topmost shader fill, then a shader stroke', () => {
    const { editor, shaded, read } = setup()
    editor.setShaderPaint([shaded], 'fills', 1, SWIRL)
    expect(findShaderModeTarget(editor.graph, shaded)?.preset).toEqual(SWIRL)

    editor.updateNodeWithUndo(shaded, { fills: [colorToFill(RED)] })
    editor.updateNodeWithUndo(shaded, {
      strokes: [{ ...colorToFill(RED), weight: 2, align: 'CENTER' }]
    })
    editor.setShaderPaint([shaded], 'strokes', 0, AURORA)
    const target = findShaderModeTarget(editor.graph, shaded)
    expect(target).toMatchObject({ list: 'strokes', index: 0, preset: AURORA })
    expect(target?.image).toBe(read().strokes[0].imageHash ?? '')
  })

  test('opens on the selection’s shader as a focused view that leaves back to editing', () => {
    const { editor, shaded, plain } = setup()
    editor.select([plain, shaded])
    expect(editor.canStartShaderMode()).toBe(true)

    expect(editor.startShaderMode()).toBe(true)
    expect(editor.getShaderMode()).toMatchObject({ nodeId: shaded, preset: AURORA })
    expect(resolveEditorProfile(editor.state)).toMatchObject({
      pointer: 'pan',
      shortcuts: 'view',
      editChrome: false,
      live: null,
      panels: false,
      leaveTo: { id: 'edit' },
      edits: true
    })

    expect(editor.leaveCanvasView()).toBe(true)
    expect(editor.getShaderMode()).toBeNull()
    expect(resolveEditorProfile(editor.state).panels).toBe(true)
  })

  test('opens on a selected layer’s shader named by its image, as the fill picker does', () => {
    const { editor, shaded, plain, read } = setup()
    editor.setShaderPaint([shaded], 'fills', 1, SWIRL)
    editor.select([plain, shaded])
    const bottom = read().fills[0].imageHash

    expect(editor.startShaderMode({ image: bottom })).toBe(true)
    expect(editor.getShaderMode()).toMatchObject({ nodeId: shaded, index: 0, preset: AURORA })
    editor.stopShaderMode()
    expect(editor.startShaderMode({ image: 'not-a-shader' })).toBe(false)
  })

  test('does not open without a shader to show', () => {
    const { editor, plain } = setup()
    editor.select([plain])
    expect(editor.canStartShaderMode()).toBe(false)
    expect(editor.startShaderMode()).toBe(false)
    expect(editor.startShaderMode({ nodeId: plain })).toBe(false)
    expect(editor.getShaderMode()).toBeNull()
    expect(resolveEditorProfile(editor.state).panels).toBe(true)
  })

  test('follows the shader as it is tuned, by the paint’s image', () => {
    const { editor, shaded, read } = setup()
    const image = read().fills[0].imageHash
    editor.startShaderMode({ nodeId: shaded, image })

    const mode = editor.getShaderMode()
    if (!mode) throw new Error('Shader Mode did not open')
    editor.setShaderPaint([mode.nodeId], mode.list, mode.index, SWIRL)

    expect(editor.getShaderMode()).toMatchObject({ image, preset: SWIRL })
    expect(presetOf(read(), expectDefined(read().fills[0]))).toEqual(SWIRL)
  })

  test('has nothing to show once its paint is gone', () => {
    const { editor, shaded } = setup()
    editor.startShaderMode({ nodeId: shaded })
    editor.updateNodeWithUndo(shaded, { fills: [colorToFill(RED)] })
    expect(editor.getShaderMode()).toBeNull()

    editor.undoAction()
    expect(editor.getShaderMode()).toMatchObject({ nodeId: shaded, preset: AURORA })
  })

  test('toggles, and ends when another document arrives', () => {
    const { editor, shaded } = setup()
    editor.select([shaded])
    editor.toggleShaderMode()
    expect(editor.getShaderMode()).not.toBeNull()
    editor.toggleShaderMode()
    expect(editor.getShaderMode()).toBeNull()

    editor.startShaderMode({ nodeId: shaded })
    editor.replaceGraph(new SceneGraph())
    expect(editor.state.canvasView).toEqual({ id: 'edit' })
  })

  test('a read-only document can be looked at in Shader Mode but not tuned', () => {
    const { editor, shaded } = setup()
    editor.setReadOnly(true)

    expect(editor.startShaderMode({ nodeId: shaded })).toBe(true)
    expect(resolveEditorProfile(editor.state).edits).toBe(false)
    expect(() => editor.setShaderPaint([shaded], 'fills', 0, SWIRL)).toThrow(ReadOnlyDocumentError)
    expect(editor.getShaderMode()?.preset).toEqual(AURORA)
    editor.stopShaderMode()
    expect(editor.getShaderMode()).toBeNull()
  })
})
