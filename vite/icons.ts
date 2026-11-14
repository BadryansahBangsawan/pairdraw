import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FileSystemIconLoader } from 'unplugin-icons/loaders'

/**
 * Provider and agent logos from LobeHub on a 24px grid, used as `<icon-ai-openai />` or
 * `~icons/ai/openai`. Plain names draw with `currentColor`, like Lucide; `-color` names keep the
 * brand's own fills, and unplugin-icons gives each drawn copy its own gradient IDs.
 */
export function aiIconCollection() {
  const manifest = fileURLToPath(import.meta.resolve('@lobehub/icons-static-svg/package.json'))
  const icons = join(dirname(manifest), 'icons')
  // Titles would add tooltips and duplicate the accessible name of the label beside the logo.
  return FileSystemIconLoader(icons, (svg) => svg.replace(/<title>.*?<\/title>/, ''))
}
