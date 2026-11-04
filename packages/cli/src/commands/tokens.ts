import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { defineCommand } from 'citty'

import {
  defaultTokenImportOptions,
  importTokensIntoGraph,
  planTokenImport,
  readCSSDesignTokens
} from '@open-pencil/core/io/formats/design-tokens'
import type { DesignTokenReadIssue } from '@open-pencil/core/io/formats/design-tokens'
import type { TokensResult } from '@open-pencil/core/rpc'

import { fmtList, ok } from '#cli/format'
import { loadDocument, populateWholeDocument, writeFigDocument } from '#cli/headless'
import { requireFile } from '#cli/app/client'
import { loadRPCData } from '#cli/rpc-data'

import { variableCommandArgs } from './variables'

export default defineCommand({
  meta: {
    description:
      'Print design variables as a stylesheet of CSS custom properties or a Tailwind v4 theme, or write them as W3C design token files'
  },
  args: {
    ...variableCommandArgs,
    format: {
      type: 'string',
      description:
        'css (:root and mode scopes), tailwind (@theme, mode scopes and variants), or dtcg (W3C design token files: one per collection mode, styles, and a resolver; needs --out)',
      default: 'css'
    },
    /** A local stylesheet whose custom properties become the document's variables. */
    import: { type: 'string', description: 'Import a local CSS file as variables' },
    write: { type: 'boolean', description: 'Write changes back to the input file' },
    output: { type: 'string', description: 'Write to a different file', required: false },
    out: {
      type: 'string',
      alias: 'o',
      description: 'Folder to write dtcg token files into'
    }
  },
  async run({ args }) {
    if (args.import) {
      await importStylesheet(args.file, args.import, args)
      return
    }
    const data = await loadRPCData<TokensResult>(
      args.file,
      'tokens',
      { format: args.format, collection: args.collection, type: args.type },
      args
    )

    if (args.json) {
      console.log(JSON.stringify(data, null, 2))
      return
    }

    if (data.files) {
      if (!args.out) throw new Error('The dtcg format writes several files: pass --out <folder>.')
      for (const file of data.files) {
        const path = join(args.out, file.path)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, `${JSON.stringify(file.content, null, 2)}\n`)
      }
      console.error(`Wrote ${data.files.length} files to ${args.out}`)
    } else if (data.tokenCount === 0) {
      console.error('No variables found.')
      return
    }

    // The stylesheet goes to stdout so it can be redirected; what was left out goes to stderr.
    if (!data.files) process.stdout.write(data.css)
    if (data.issues.length > 0) {
      console.error(
        fmtList(
          data.issues.map((issue) => ({ header: issue })),
          { compact: true }
        )
      )
    }
  }
})

/**
 * Reads a local stylesheet's custom properties into the document's variables: `:root` is each
 * collection's default mode and selectors such as `.dark` or Tailwind's `@theme` are modes.
 * Without `--write` or `--output` it only reports what it would import.
 */
async function importStylesheet(
  file: string | undefined,
  cssPath: string,
  args: { write?: boolean; output?: string; json?: boolean }
): Promise<void> {
  const css = await readFile(cssPath, 'utf8')
  const graph = await loadDocument(requireFile(file))
  populateWholeDocument(graph)
  const bundle = readCSSDesignTokens(graph, css, { file: cssPath })
  const plan = planTokenImport(graph, bundle, defaultTokenImportOptions(graph, bundle))
  const pageId = graph.getPages()[0]?.id ?? graph.rootId
  const result = importTokensIntoGraph(graph, pageId, plan)
  if (args.json) {
    console.log(
      JSON.stringify(
        { collections: result.collectionIds, variables: result.variableIds, issues: bundle.issues },
        null,
        2
      )
    )
  } else {
    console.log(
      ok(
        `Imported ${result.variableIds.length} variables into ${result.collectionIds.length} collections`
      )
    )
  }
  if (bundle.issues.length > 0)
    console.error(
      fmtList(
        bundle.issues.map((issue) => ({ header: readIssueMessage(issue) })),
        { compact: true }
      )
    )
  if (args.write) await writeFigDocument(graph, requireFile(file))
  else if (args.output) await writeFigDocument(graph, args.output)
}

/** A skipped stylesheet rule as one line, naming the rule when the issue records one. */
function readIssueMessage(issue: DesignTokenReadIssue): string {
  return 'rule' in issue ? `${issue.file}: ${issue.rule}` : issue.file
}
