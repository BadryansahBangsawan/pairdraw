import { FigmaAPI } from '@open-pencil/core/figma-api'
import { ALL_TOOLS, toolFailure } from '@open-pencil/core/tools'
import { SceneGraph } from '@open-pencil/scene-graph'

import { expectDefined } from './assert'

export function setupToolTest(): { graph: SceneGraph; figma: FigmaAPI } {
  const graph = new SceneGraph()
  return { graph, figma: new FigmaAPI(graph) }
}

/**
 * Runs a tool as the app's runner does: the fonts its text edits need load first, and one that
 * cannot load is the call's error.
 */
export async function runTool(
  figma: FigmaAPI,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const tool = expectDefined(
    ALL_TOOLS.find((candidate) => candidate.name === name),
    `tool ${name}`
  )
  try {
    await tool.loadFonts(figma, args)
  } catch (error) {
    return toolFailure(error)
  }
  return tool.execute(figma, args)
}
