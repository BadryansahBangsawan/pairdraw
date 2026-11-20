import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import { defineCommand } from 'citty'
import { compact } from 'es-toolkit/array'

import {
  defaultTokenImportOptions,
  importTokensIntoGraph,
  planTokenImport,
  planTokenSync,
  readCSSDesignTokens,
  readTokenSourceFiles,
  type DesignSystemIssue,
  type DesignTokenSourceFile,
  type TokenDrift
} from '@pairdraw/core/io/formats/design-tokens'
import { importDesignSystemFolder, readDesignSystemFolder } from '@pairdraw/core/node/design-system'
import type { TokensResult } from '@pairdraw/core/rpc'

import { requireFile } from '#cli/app/client'
import { fmtList, ok, printJSON } from '#cli/format'
import { loadDocument, populateWholeDocument, writeDocumentFile } from '#cli/headless'
import { loadRPCData } from '#cli/rpc-data'

import { variableCommandArgs } from './variables'

export default defineCommand({
  meta: {
    name: 'tokens',
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
    /** A project folder whose stylesheets become the document's variables. */
    project: {
      type: 'string',
      description:
        'Import CSS variables from a local project folder (Tailwind v4 @theme and shadcn/ui :root/.dark). Does not run JavaScript config'
    },
    /** A local stylesheet or project folder the document's variables are compared with. */
    check: {
      type: 'string',
      description:
        'Compare the variables with a local stylesheet or project folder and list what differs; exits 1 when anything does'
    },
    write: { type: 'boolean', description: 'Write changes back to the input file' },
    output: { type: 'string', description: 'Write to a different file', required: false },
    out: {
      type: 'string',
      alias: 'o',
      description: 'Folder to write dtcg token files into'
    }
  },
  async run({ args }) {
    if (compact([args.import, args.project, args.check]).length > 1) {
      throw new Error('Pass one of --import, --project, or --check, not both.')
    }
    if (args.check) {
      await checkTokens(args.file, args.check, args)
      return
    }
    // --out is where `--format dtcg` writes its files; an import writes the document itself.
    if (args.out && (args.import || args.project)) {
      throw new Error(
        '--out writes dtcg token files; an import writes the document with --write or --output.'
      )
    }
    if (args.import) {
      await importStylesheet(args.file, args.import, args)
      return
    }
    if (args.project) {
      await importProject(args.file, args.project, args)
      return
    }
    const data = await loadRPCData<TokensResult>(
      args.file,
      'tokens',
      { format: args.format, collection: args.collection, type: args.type },
      args
    )

    if (args.json) {
      await printJSON(data)
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
    await printJSON({
      collections: result.collectionIds,
      variables: result.variableIds,
      issues: bundle.issues
    })
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
        bundle.issues.map((issue) => ({ header: designSystemIssueLine(issue) })),
        { compact: true }
      )
    )
  if (args.write) await writeDocumentFile(graph, requireFile(file))
  else if (args.output) await writeDocumentFile(graph, args.output)
}

function designSystemIssueLine(issue: DesignSystemIssue): string {
  switch (issue.kind) {
    case 'invalid-manifest':
      return `${issue.path}: components.json could not be read`
    case 'unsupported-config':
      return `${issue.path}: project config is not executed`
    case 'escaped-path':
      return `${issue.path}: path leaves the project folder`
    case 'file-too-large':
      return `${issue.path}: file is larger than the read limit`
    case 'too-many-files':
      return `${issue.path}: reading stopped after the file-count limit`
    case 'total-too-large':
      return `${issue.path}: reading stopped after the total size limit`
    case 'unreadable':
      return `${issue.path}: file could not be read`
    case 'components-not-imported':
      return `${issue.path}: components from source are not imported`
    case 'unsupported-value':
      return `${issue.path}: ${issue.name} was left out (${issue.reason})`
    case 'invalid-file':
      return `${issue.file}: stylesheet could not be read`
    case 'missing-file':
      return `${issue.file}: file named from ${issue.from} is missing`
    case 'unsupported-css':
      return `${issue.file}: unsupported rule ${issue.rule}`
    case 'foreign-css-override':
      return `${issue.file}: ${issue.property} belongs to ${issue.collection}`
    default: {
      const exhaustive: never = issue
      return exhaustive
    }
  }
}

/**
 * Reads a project folder's stylesheets into the document's variables. Tailwind v4 `@theme`
 * blocks and shadcn/ui `:root` / `.dark` pairs are included. JavaScript config is not run.
 */
async function importProject(
  file: string | undefined,
  projectPath: string,
  args: { write?: boolean; output?: string; json?: boolean }
): Promise<void> {
  const graph = await loadDocument(requireFile(file))
  populateWholeDocument(graph)
  const result = await importDesignSystemFolder(graph, projectPath)
  if (args.json) {
    await printJSON({
      collections: result.collectionIds,
      variables: result.variableIds,
      issues: result.issues
    })
  } else {
    console.log(
      ok(
        `Imported ${result.variableIds.length} variables into ${result.collectionIds.length} collections`
      )
    )
  }
  if (result.issues.length > 0) {
    console.error(
      fmtList(
        result.issues.map((issue) => ({ header: designSystemIssueLine(issue) })),
        { compact: true }
      )
    )
  }
  if (args.write) await writeDocumentFile(graph, requireFile(file))
  else if (args.output) await writeDocumentFile(graph, args.output)
}

/** A stylesheet or token file as it is, or a project folder's stylesheets as an import reads them. */
async function readTokenSource(
  path: string
): Promise<{ files: DesignTokenSourceFile[]; issues: DesignSystemIssue[] }> {
  if ((await stat(path)).isDirectory()) return readDesignSystemFolder(path)
  return { files: [{ path: basename(path), text: await readFile(path, 'utf8') }], issues: [] }
}

function driftLine(drift: TokenDrift): string {
  const where = `${drift.collection} / ${drift.variable}${drift.mode ? ` (${drift.mode})` : ''}`
  const values = [
    drift.code === undefined ? undefined : `code ${drift.code}`,
    drift.canvas === undefined ? undefined : `canvas ${drift.canvas}`
  ].filter((part) => part !== undefined)
  return `${where}: ${drift.kind}${values.length > 0 ? `, ${values.join(', ')}` : ''}`
}

/**
 * Compares the document's variables with linked code and lists every token that differs, for a
 * check in CI: the process exits 1 when anything does. The document is not changed.
 */
async function checkTokens(
  file: string | undefined,
  sourcePath: string,
  args: { json?: boolean }
): Promise<void> {
  const graph = await loadDocument(requireFile(file))
  populateWholeDocument(graph)
  const source = await readTokenSource(sourcePath)
  const { bundles, issues } = readTokenSourceFiles(graph, source.files)
  issues.unshift(...source.issues)
  const { drift } = planTokenSync(graph, bundles)
  if (args.json) {
    await printJSON({ in_sync: drift.length === 0, drift, issues })
  } else if (drift.length === 0) {
    console.log(ok(`Variables match ${sourcePath}`))
  } else {
    console.log(
      fmtList(
        drift.map((entry) => ({ header: driftLine(entry) })),
        { compact: true }
      )
    )
  }
  if (issues.length > 0 && !args.json)
    console.error(
      fmtList(
        issues.map((issue) => ({ header: designSystemIssueLine(issue) })),
        { compact: true }
      )
    )
  if (drift.length > 0) process.exit(1)
}
