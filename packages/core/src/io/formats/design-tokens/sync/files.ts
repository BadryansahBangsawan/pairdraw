import { partition } from 'es-toolkit/array'
import { posix } from 'pathe'

import type { SceneGraph } from '@pairdraw/scene-graph'

import {
  designSystemStylesheets,
  readDesignSystemStylesheet,
  type DesignSystemIssue
} from '#core/io/formats/design-tokens/project'
import {
  readDesignTokens,
  type DesignTokenBundle,
  type DesignTokenSourceFile
} from '#core/io/formats/design-tokens/read'

/** Stylesheets and the shadcn/ui manifest that names one; every other file is DTCG tokens. */
function isStylesheetSide(path: string): boolean {
  const name = posix.basename(path)
  return name.endsWith('.css') || name === 'components.json'
}

/**
 * Linked code read into token bundles against the document as it is now: one per stylesheet,
 * picked as a project folder import picks them, and one for all DTCG token files together.
 */
export function readTokenSourceFiles(
  graph: SceneGraph,
  files: readonly DesignTokenSourceFile[]
): { bundles: DesignTokenBundle[]; issues: DesignSystemIssue[] } {
  const [css, tokens] = partition(files, (file) => isStylesheetSide(file.path))
  const { stylesheets, issues } = designSystemStylesheets({ files: css, issues: [] })
  const bundles = stylesheets.map((file) => readDesignSystemStylesheet(graph, file, issues))
  if (tokens.length > 0) {
    const bundle = readDesignTokens(tokens)
    issues.push(...bundle.issues)
    bundles.push(bundle)
  }
  return { bundles, issues }
}
