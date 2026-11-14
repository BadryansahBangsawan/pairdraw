import { FigmaAPI } from '@pairdraw/core/figma-api'
import { compileScript } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

/** What `code` gives back when run as a script: its result, or the message it stopped with. */
export function scriptResult(code: string, figma = new FigmaAPI(new SceneGraph())): Promise<unknown> {
  return compileScript(code)(figma).catch((error: unknown) =>
    error instanceof Error ? error.message : error
  )
}
