import * as v from 'valibot'

import { analysisLimitInputSchema } from '#core/tools/analyze/schema'
import { defineTool } from '#core/tools/schema'

const sourceFilesSchema = v.pipe(
  v.array(v.object({ path: v.string(), text: v.string() })),
  v.minLength(1),
  v.description(
    'The linked code, each file with its path and text: stylesheets with CSS custom properties or a Tailwind v4 @theme (and components.json), or W3C design token JSON files'
  )
)

export const tokenDrift = defineTool({
  name: 'token_drift',
  description:
    'Compare design tokens in code with the document variables, without changing anything. Pass the stylesheets (CSS custom properties, Tailwind v4 @theme, shadcn/ui :root/.dark) or W3C design token files. Each finding names the collection, variable, and mode, the value in code and on the canvas, and its kind: code (changed in code since the last sync), canvas (changed on the canvas), conflict (changed on both, or never synced), added (new in code), or missing (gone from code).',
  execution: { kind: 'async', mutation: 'none' },
  input: v.strictObject({ files: sourceFilesSchema, limit: analysisLimitInputSchema }),
  execute: async (figma, args) => {
    const { planTokenSync } = await import('#core/io/formats/design-tokens/sync/drift')
    const { readTokenSourceFiles } = await import('#core/io/formats/design-tokens/sync/files')
    const { bundles, issues } = readTokenSourceFiles(figma.graph, args.files)
    const { drift } = planTokenSync(figma.graph, bundles)
    return {
      in_sync: drift.length === 0,
      total: drift.length,
      drift: drift.slice(0, args.limit),
      issues
    }
  }
})
