import { isEmptyObject, omit, pick } from 'es-toolkit'

import type { Fill, SceneNode, Stroke } from '@open-pencil/scene-graph'
import {
  createShaderPaint,
  createShaderSourcePaint,
  isShaderSourcePaint,
  shaderOfPaint,
  withShaderPaints,
  type ShaderPaint,
  type ShaderPreset,
  type ShaderSourcePaint,
  type ShaderUniformValue
} from '@open-pencil/scene-graph/shaders'

import { compileShader } from '#core/canvas/shaders/compile'
import type { EditorContext } from '#core/editor/types'

/** What a stroke has beyond its paint. */
const STROKE_FIELDS = [
  'weight',
  'align',
  'cap',
  'join',
  'dashPattern'
] as const satisfies readonly (keyof Stroke)[]

const replaceAt = <T>(items: readonly T[], index: number, item: T) =>
  items.map((existing, at) => (at === index ? item : existing))

/** Which of a layer's paint lists a shader is set in. */
export type ShaderPaintList = 'fills' | 'strokes'

interface NodeActions {
  updateNodeWithUndo(id: string, changes: Partial<SceneNode>, label?: string): void
}

/**
 * Shader paint commands. A shader paint is an image paint of the shader's frame plus the preset
 * in plugin data, so each command records both together, as one undo step.
 */
export function createShaderActions(ctx: EditorContext, nodes: NodeActions) {
  /** Records `shader` as what paint `index` of `list` draws, keeping the paint's look. */
  function install(
    nodeId: string,
    list: ShaderPaintList,
    index: number,
    previous: Fill,
    paint: Fill,
    shader: ShaderPaint
  ): void {
    const node = ctx.graph.getNode(nodeId)
    if (!node) return
    const shown = {
      ...paint,
      opacity: previous.opacity,
      visible: previous.visible
    }
    const fills = list === 'fills' ? replaceAt(node.fills, index, shown) : node.fills
    // A stroke keeps its weight and geometry; only its paint changes.
    const strokes =
      list === 'strokes'
        ? node.strokes.map((item, at) =>
            at === index ? { ...pick(item, STROKE_FIELDS), ...shown } : item
          )
        : node.strokes
    nodes.updateNodeWithUndo(nodeId, {
      [list]: list === 'fills' ? fills : strokes,
      pluginData: withShaderPaints(node, [...fills, ...strokes], [shader])
    })
  }

  function setNodeShader(
    nodeId: string,
    list: ShaderPaintList,
    index: number,
    preset: ShaderPreset
  ): void {
    const node = ctx.graph.getNode(nodeId)
    const previous = node?.[list].at(index)
    if (!node || !previous) return
    const existing = shaderOfPaint(node, previous)
    const { paint, shader } = existing
      ? {
          paint: previous,
          shader: { image: existing.image, preset: structuredClone(preset) }
        }
      : createShaderPaint(preset)
    install(nodeId, list, index, previous, paint, shader)
  }

  function setNodeSource(
    nodeId: string,
    list: ShaderPaintList,
    index: number,
    source: string
  ): void {
    const node = ctx.graph.getNode(nodeId)
    const previous = node?.[list].at(index)
    if (!node || !previous) return
    const existing = shaderOfPaint(node, previous)
    // Code replaces code in place: the paint keeps its frame image, so pixels drawn before and
    // after an edit stay on the same paint and undo swaps only the text.
    const kept = existing && isShaderSourcePaint(existing)
    if (kept) {
      install(nodeId, list, index, previous, previous, { ...existing, source })
      return
    }
    const { paint, shader } = createShaderSourcePaint(source)
    install(nodeId, list, index, previous, paint, shader)
  }

  /**
   * Makes paint `index` of `list` on each of `nodeIds` draw `preset`, as one undo step: a shader
   * paint keeps its image and takes the new preset, any other paint becomes a new shader paint.
   * Frames are drawn once the edit settles.
   */
  function setShaderPaint(
    nodeIds: readonly string[],
    list: ShaderPaintList,
    index: number,
    preset: ShaderPreset
  ): void {
    ctx.undo.beginBatch('Set shader')
    try {
      for (const id of nodeIds) setNodeShader(id, list, index, preset)
    } finally {
      ctx.undo.commitBatch()
    }
  }

  /**
   * Makes paint `index` of `list` on each of `nodeIds` draw shader `source`, as one undo step.
   * A paint that already draws code keeps its image, uniforms, and bindings; a preset paint or any
   * other paint becomes a new shader paint. A blank source is ignored, as the schema needs code.
   */
  function setShaderSource(
    nodeIds: readonly string[],
    list: ShaderPaintList,
    index: number,
    source: string
  ): void {
    if (!source.trim()) return
    ctx.undo.beginBatch('Set shader code')
    try {
      for (const id of nodeIds) setNodeSource(id, list, index, source)
    } finally {
      ctx.undo.commitBatch()
    }
  }

  /**
   * What stops `source` from drawing, or null when it compiles or the canvas cannot compile
   * shaders. The panel shows it under the code editor, before the edit is applied.
   */
  function shaderCodeError(source: string): string | null {
    const ck = ctx.getCk()
    if (!ck || !source.trim()) return null
    return compileShader(ck, source).error
  }

  /**
   * Sets the value of shader input `name` on paint `index` of `list`, as one undo step. Only a
   * paint that already draws code has inputs to set; a preset or other paint is left alone.
   */
  function setShaderUniform(
    nodeIds: readonly string[],
    list: ShaderPaintList,
    index: number,
    name: string,
    value: ShaderUniformValue
  ): void {
    editSourcePaints('Set shader input', nodeIds, list, index, (id, paint, shader) => {
      install(id, list, index, paint, paint, {
        ...shader,
        uniforms: { ...shader.uniforms, [name]: value }
      })
    })
  }

  /**
   * Makes shader input `name` on paint `index` of `list` follow `variableId`, or stop following a
   * variable when null, as one undo step. The binding is stored with the shader, next to the value
   * it replaces, so every renderer that draws the paint resolves it the same way.
   */
  function setShaderUniformBinding(
    nodeIds: readonly string[],
    list: ShaderPaintList,
    index: number,
    name: string,
    variableId: string | null
  ): void {
    editSourcePaints(
      variableId ? 'Bind shader input' : 'Unbind shader input',
      nodeIds,
      list,
      index,
      (id, paint, shader) => {
        const bindings = omit(shader.uniformBindings ?? {}, [name])
        const bound = variableId ? { ...bindings, [name]: variableId } : bindings
        install(
          id,
          list,
          index,
          paint,
          paint,
          isEmptyObject(bound)
            ? omit(shader, ['uniformBindings'])
            : { ...shader, uniformBindings: bound }
        )
      }
    )
  }

  /**
   * Runs `write` for each node whose paint `index` of `list` draws code, as one undo step: the
   * inputs and bindings of a shader are edited the same way, and only a code paint has any.
   */
  function editSourcePaints(
    label: string,
    nodeIds: readonly string[],
    list: ShaderPaintList,
    index: number,
    write: (nodeId: string, paint: Fill, shader: ShaderSourcePaint) => void
  ): void {
    ctx.undo.beginBatch(label)
    try {
      for (const id of nodeIds) {
        const node = ctx.graph.getNode(id)
        const paint = node?.[list].at(index)
        const shader = node && paint ? shaderOfPaint(node, paint) : undefined
        if (!node || !paint || !shader || !isShaderSourcePaint(shader)) continue
        write(id, paint, shader)
      }
    } finally {
      ctx.undo.commitBatch()
    }
  }

  return {
    setShaderPaint,
    setShaderSource,
    shaderCodeError,
    setShaderUniform,
    setShaderUniformBinding
  }
}
