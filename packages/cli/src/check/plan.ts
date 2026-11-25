import { extname } from 'node:path'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

/** The formats `pairdraw check` reads: the ones a design repo keeps that hold a scene graph. */
const DESIGN_EXTENSIONS = new Set(['.fig', '.pen'])

export function isDesignFile(path: string): boolean {
  return DESIGN_EXTENSIONS.has(extname(path).toLowerCase())
}

/** The frames a run renders, and how many the limit left out. */
export interface FrameSelection {
  frames: SceneNode[]
  skipped: number
}

const FRAME_TYPES: Partial<Record<SceneNode['type'], true>> = { FRAME: true, COMPONENT: true }

/**
 * The frames a check renders, in document order: a page's own frames and components and the ones
 * directly inside its sections, without the layers a frame holds, instances, or invisible layers.
 * A person checks screens, not every nested box, and the selection must be the same on every run.
 */
export function framesToCheck(graph: SceneGraph, maxFrames: number): FrameSelection {
  const candidates: SceneNode[] = []
  for (const page of graph.getPages()) {
    for (const child of graph.getChildren(page.id)) {
      if (child.internalOnly) continue
      if (child.type === 'SECTION') {
        for (const inner of graph.getChildren(child.id)) {
          if (isRenderableFrame(inner)) candidates.push(inner)
        }
        continue
      }
      if (isRenderableFrame(child)) candidates.push(child)
    }
  }
  return {
    frames: candidates.slice(0, maxFrames),
    skipped: Math.max(0, candidates.length - maxFrames)
  }
}

function isRenderableFrame(node: SceneNode): boolean {
  return FRAME_TYPES[node.type] === true && node.visible && !node.internalOnly
}
