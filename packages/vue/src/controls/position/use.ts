import { computed } from 'vue'

import {
  panelNumber,
  panelPosition,
  panelPositionChange,
  panelRotation,
  panelRotationChange
} from '@pairdraw/core/geometry'
import type { NumericNodeProperty, SceneNode } from '@pairdraw/scene-graph'
import { layerRotates } from '@pairdraw/scene-graph/generated'
import { takesOwnSize } from '@pairdraw/scene-graph/instances'

import { MIXED, useNodeProps, type MixedValue } from '#vue/controls/node-props/use'
import { usePropScrub } from '#vue/controls/prop-scrub/use'
import { useEditor } from '#vue/editor/context'

/**
 * Returns position-related state and actions for the current selection.
 *
 * This composable is designed for property panels that edit x/y, size,
 * rotation, alignment, flipping, and multi-node transforms.
 */
export function usePosition() {
  const editor = useEditor()

  const { nodes, node, active, isMulti, prop } = useNodeProps()
  const ids = computed(() => nodes.value.map((n) => n.id))
  /** Whether the selection turns and flips; a sticky note or connector stays upright. */
  const rotates = computed(() => nodes.value.every(layerRotates))
  /**
   * Whether every selected layer takes a size of its own: a layer inside an instance shows its
   * component's size, as in Figma, while an instance nested in another may be resized.
   */
  const resizes = computed(
    () =>
      nodes.value.length > 0 && nodes.value.every((target) => takesOwnSize(editor.graph, target))
  )

  type PanelProp = 'x' | 'y' | 'rotation' | 'width' | 'height'

  // X, Y, rotation, width and height read as Figma's panel shows them: two decimals, the turned
  // layer's box on the canvas and its counterclockwise angle; see `panelPosition` and
  // `panelRotation`.
  function shown(target: SceneNode, key: PanelProp): number {
    if (key === 'rotation') return panelNumber(panelRotation(target, editor.graph))
    if (key === 'x' || key === 'y') return panelNumber(panelPosition(target, editor.graph)[key])
    return panelNumber(target[key])
  }

  /** The shown value of every selected node, or MIXED when they differ. */
  function panelProp(key: PanelProp) {
    return computed<MixedValue<number>>(() => {
      const values = nodes.value.map((target) => shown(target, key))
      if (values.length === 0) return 0
      const first = values[0]
      return values.every((value) => value === first) ? first : MIXED
    })
  }

  const x = computed(() => (node.value ? shown(node.value, 'x') : 0))
  const y = computed(() => (node.value ? shown(node.value, 'y') : 0))
  const width = computed(() => (node.value ? shown(node.value, 'width') : 0))
  const height = computed(() => (node.value ? shown(node.value, 'height') : 0))
  const rotation = computed(() => (node.value ? shown(node.value, 'rotation') : 0))

  const {
    updateProp: _updateProp,
    updateEach,
    commitProp: _commitProp,
    cancelProp: _cancelProp
  } = usePropScrub(editor)

  // Typed X, Y, and rotation become each node's own move or turn, as typing them in Figma does.
  function updateProp(key: NumericNodeProperty, value: number) {
    if (key === 'x' || key === 'y') {
      updateEach(nodes.value, key, (target) =>
        panelPositionChange(target, editor.graph, key, value)
      )
    } else if (key === 'rotation') {
      updateEach(nodes.value, key, (target) => panelRotationChange(target, editor.graph, value))
    } else {
      _updateProp(nodes.value, key, value)
    }
  }

  function commitProp(key: NumericNodeProperty, value: number, previous: number) {
    _commitProp(nodes.value, key, value, previous)
  }

  function cancelProp(key: NumericNodeProperty) {
    _cancelProp(nodes.value, key)
  }

  /** Whether every selected layer sits in an auto layout, where it can ignore that layout. */
  const inAutoLayout = computed(
    () =>
      nodes.value.length > 0 &&
      nodes.value.every((target) => {
        const parent = target.parentId ? editor.graph.getNode(target.parentId) : undefined
        return !!parent && parent.layoutMode !== 'NONE'
      })
  )
  /** On only when every selected layer ignores its auto layout. */
  const ignoresAutoLayout = computed(
    () =>
      inAutoLayout.value && nodes.value.every((target) => target.layoutPositioning === 'ABSOLUTE')
  )

  /** Figma's Ignore auto layout toggle: a mixed selection is taken out of its layouts. */
  function toggleIgnoreAutoLayout() {
    editor.setLayoutPositioning(ids.value, ignoresAutoLayout.value ? 'AUTO' : 'ABSOLUTE')
  }

  function align(axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') {
    editor.alignNodes(ids.value, axis, pos)
  }

  function flip(axis: 'horizontal' | 'vertical') {
    editor.flipNodes(ids.value, axis)
  }

  function rotate(degrees: number) {
    editor.rotateNodes(ids.value, degrees)
  }

  return {
    editor,
    nodes,
    node,
    active,
    isMulti,
    prop,
    panelProp,
    ids,
    x,
    y,
    width,
    height,
    rotation,
    rotates,
    resizes,
    inAutoLayout,
    ignoresAutoLayout,
    toggleIgnoreAutoLayout,
    updateProp,
    commitProp,
    cancelProp,
    align,
    flip,
    rotate
  }
}
