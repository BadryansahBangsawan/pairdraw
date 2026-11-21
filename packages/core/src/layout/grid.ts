import { Direction, Display, Gutter, type Node as YogaNode } from 'yoga-layout'

import type { GridTrack, SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { layoutSizing } from '@pairdraw/scene-graph/layout'
import { resolveNodeLayoutDirection } from '@pairdraw/scene-graph/text/direction'

import { ownAxisSizing } from './axis-sizing'
import { applyContentInsets, applyStrokeMargins } from './strokes'
import {
  applyMinMaxConstraints,
  configureAbsoluteChild,
  createYogaNode,
  mapGridTrack
} from './yoga-helpers'

/**
 * A grid frame that hugs an axis has no space to share out, so its fractional tracks take their
 * content's size there and the frame keeps the smallest box around them, as Figma hugs a grid.
 */
export function gridTracksForAxis(node: SceneNode, axis: 'width' | 'height'): GridTrack[] {
  const tracks = axis === 'width' ? node.gridTemplateColumns : node.gridTemplateRows
  if (ownAxisSizing(node, axis) !== 'HUG') return tracks
  return tracks.map((track) => (track.sizing === 'FR' ? { sizing: 'AUTO', value: 0 } : track))
}

function configureAsGrid(
  yogaNode: YogaNode,
  node: SceneNode,
  direction: Exclude<SceneNode['layoutDirection'], 'AUTO'>
): void {
  yogaNode.setDisplay(Display.Grid)
  yogaNode.setDirection(direction === 'RTL' ? Direction.RTL : Direction.LTR)
  if (ownAxisSizing(node, 'width') !== 'HUG') yogaNode.setWidth(node.width)
  if (ownAxisSizing(node, 'height') !== 'HUG') {
    if (node.gridTemplateRows.length > 0 || node.height > 0) yogaNode.setHeight(node.height)
  }

  if (node.gridTemplateColumns.length > 0) {
    yogaNode.setGridTemplateColumns(gridTracksForAxis(node, 'width').map(mapGridTrack))
  }
  if (node.gridTemplateRows.length > 0) {
    yogaNode.setGridTemplateRows(gridTracksForAxis(node, 'height').map(mapGridTrack))
  }

  yogaNode.setGap(Gutter.Column, node.gridColumnGap)
  yogaNode.setGap(Gutter.Row, node.gridRowGap)

  applyContentInsets(yogaNode, node)
  applyMinMaxConstraints(yogaNode, node)
}

export function createGridChildNode(graph: SceneGraph, child: SceneNode): YogaNode {
  const yogaChild = createYogaNode()
  if (!child.visible) {
    yogaChild.setDisplay(Display.None)
  } else {
    const pos = child.gridPosition
    if (pos) {
      // A span from an explicit line ends N lines on; from an auto line it is CSS
      // `grid-column: span N`, which Yoga places by itself.
      if (pos.column > 0) {
        yogaChild.setGridColumnStart(pos.column)
        yogaChild.setGridColumnEndSpan(pos.columnSpan)
      } else if (pos.columnSpan > 1) {
        yogaChild.setGridColumnStartSpan(pos.columnSpan)
      }
      if (pos.row > 0) {
        yogaChild.setGridRowStart(pos.row)
        yogaChild.setGridRowEndSpan(pos.rowSpan)
      } else if (pos.rowSpan > 1) {
        yogaChild.setGridRowStartSpan(pos.rowSpan)
      }
    }
    // Each axis fills its cell on its own, as in Figma: grow for width, stretch for height.
    if (layoutSizing(graph, child, 'HORIZONTAL') === 'FILL') yogaChild.setWidthStretch()
    else yogaChild.setWidth(child.width)
    if (layoutSizing(graph, child, 'VERTICAL') === 'FILL') yogaChild.setHeightStretch()
    else yogaChild.setHeight(child.height)
  }
  return yogaChild
}

export function buildGridTree(
  graph: SceneGraph,
  frame: SceneNode,
  inheritedDirection: 'LTR' | 'RTL'
): YogaNode {
  const root = createYogaNode()
  const direction = resolveNodeLayoutDirection(frame, inheritedDirection)
  configureAsGrid(root, frame, direction)

  const children = graph.getChildren(frame.id)
  for (const child of children) {
    if (child.layoutPositioning === 'ABSOLUTE') {
      const yogaChild = createYogaNode()
      configureAbsoluteChild(yogaChild, child)
      root.insertChild(yogaChild, root.getChildCount())
    } else {
      const yogaChild = createGridChildNode(graph, child)
      applyStrokeMargins(yogaChild, child, frame)
      if (
        child.layoutMode === 'GRID' ||
        child.layoutMode === 'HORIZONTAL' ||
        child.layoutMode === 'VERTICAL'
      ) {
        const childDirection = resolveNodeLayoutDirection(child, direction)
        yogaChild.setDirection(childDirection === 'RTL' ? Direction.RTL : Direction.LTR)
      }
      root.insertChild(yogaChild, root.getChildCount())
    }
  }

  return root
}
