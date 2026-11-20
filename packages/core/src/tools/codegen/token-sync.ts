import * as v from 'valibot'

import type { FigmaAPI } from '#core/figma-api'
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
    'Compare design tokens in code with the document variables, without changing anything. Pass the stylesheets (CSS custom properties, Tailwind v4 @theme, shadcn/ui :root/.dark) or W3C design token files. Each finding names the collection, variable, and mode, the value in code and on the canvas, and its kind: code (changed in code since the last sync), canvas (changed on the canvas), conflict (changed on both, or never synced), added (new in code), missing (gone from code), or deleted (deleted on the canvas while the code still has it). With include_layers it also lists layers on the current page that use a raw color a token holds without being bound to it.',
  execution: { kind: 'async', mutation: 'none' },
  input: v.strictObject({
    files: sourceFilesSchema,
    include_layers: v.optional(
      v.pipe(
        v.boolean(),
        v.description('Also list layers on the current page with raw values a token holds')
      ),
      false
    ),
    limit: analysisLimitInputSchema
  }),
  execute: async (figma, args) => {
    const { planTokenSync } = await import('#core/io/formats/design-tokens/sync/drift')
    const { readTokenSourceFiles } = await import('#core/io/formats/design-tokens/sync/files')
    const { tokenSourceForFiles } = await import('#core/io/formats/design-tokens/sync/apply')
    const { bundles, issues } = readTokenSourceFiles(figma.graph, args.files)
    const { drift } = planTokenSync(
      figma.graph,
      bundles,
      tokenSourceForFiles(figma.graph, args.files)
    )
    const result = {
      in_sync: drift.length === 0,
      total: drift.length,
      drift: drift.slice(0, args.limit),
      issues
    }
    if (!args.include_layers) return result
    return { ...result, layers: await unboundLayers(figma, args.limit) }
  }
})

/** The lint rules that find raw values a token holds. */
const TOKEN_VALUE_RULES = ['no-hardcoded-colors']

/** Layers on the current page that hold a token's value without being bound to it. */
async function unboundLayers(figma: FigmaAPI, limit: number) {
  const { createLinter } = await import('#core/lint')
  const linter = createLinter({
    rules: TOKEN_VALUE_RULES,
    config: { rules: Object.fromEntries(TOKEN_VALUE_RULES.map((rule) => [rule, 'info'])) }
  })
  return linter
    .lintGraph(figma.graph, [figma.currentPageId])
    .messages.slice(0, limit)
    .map(({ nodeId, nodeName, ruleId, message, fix }) => ({
      nodeId,
      name: nodeName,
      rule: ruleId,
      message,
      ...(fix ? { fix } : {})
    }))
}

export const syncTokens = defineTool({
  name: 'sync_tokens',
  description:
    'Bring design tokens from code into the document variables and remember the link, so later syncs and token_drift know which side changed. Pass the same files as token_drift. Values changed only in code and tokens new in code always come in. A token changed on the canvas or on both sides follows conflicts: skip (default) leaves it as it is for a person to review, code takes the value in code, canvas keeps the canvas value. Tokens gone from code keep their variables. Returns how many tokens came in and what was left.',
  execution: { kind: 'async', mutation: 'document' },
  input: v.strictObject({
    files: sourceFilesSchema,
    conflicts: v.optional(
      v.pipe(
        v.picklist(['skip', 'code', 'canvas']),
        v.description('What a token changed on the canvas or on both sides takes (default skip)')
      ),
      'skip'
    ),
    limit: analysisLimitInputSchema
  }),
  execute: async (figma, args) => {
    const { syncTokenFiles } = await import('#core/io/formats/design-tokens/sync/apply')
    const { conflicts } = args
    const result = syncTokenFiles(figma.graph, args.files, {
      conflicts: conflicts === 'skip' ? undefined : conflicts
    })
    return { ...result, left: result.left.slice(0, args.limit) }
  }
})
