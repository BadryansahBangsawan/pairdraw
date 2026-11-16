import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FileSystemIconLoader } from 'unplugin-icons/loaders'

/** Marks LobeHub does not carry, such as omp's, taken from each project's own artwork. */
const OWN_LOGOS = fileURLToPath(new URL('../assets/ai-logos', import.meta.url))

// Titles would add tooltips and duplicate the accessible name of the label beside the logo.
function withoutTitle(svg: string): string {
  return svg.replace(/<title>.*?<\/title>/, '')
}

/**
 * Provider and agent logos from LobeHub on a 24px grid, used as `<icon-ai-openai />` or
 * `~icons/ai/openai`. Plain names draw with `currentColor`, like Lucide; `-color` names keep the
 * brand's own fills, and unplugin-icons gives each drawn copy its own gradient IDs. A mark in
 * `assets/ai-logos` is used for a name LobeHub lacks.
 */
export function aiIconCollection() {
  const manifest = fileURLToPath(import.meta.resolve('@lobehub/icons-static-svg/package.json'))
  const lobehub = FileSystemIconLoader(join(dirname(manifest), 'icons'), withoutTitle)
  const own = FileSystemIconLoader(OWN_LOGOS, withoutTitle)
  return async (name: string) => (await own(name)) ?? lobehub(name)
}
