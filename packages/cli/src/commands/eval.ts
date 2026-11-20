import { resolve } from 'node:path'
import { format } from 'node:util'

import { defineCommand } from 'citty'
import * as v from 'valibot'

import { recordDocumentChange } from '@pairdraw/core'
import { createDesignGuard } from '@pairdraw/core/design-memory'
import { flushPendingLayout } from '@pairdraw/core/figma-api'
import { compileScript } from '@pairdraw/core/tools'

import { isAppMode, requireFile, rpcResponse } from '#cli/app/client'
import { appPageTargetRPCArgs, pageOptions } from '#cli/app/target'
import { printError, warn, writeStdout } from '#cli/format'
import { documentWriteOptions, editDocument, writeDocumentFile } from '#cli/headless'
import { requireOutputDirectory } from '#cli/options'
import { headlessPreview } from '#cli/session/open'
import { appPreview, previewNotice, previewOptions, previewScale } from '#cli/session/preview'
import { createHeadlessFigma, openHeadlessFigma } from '#cli/tool-data'

async function printResult(value: unknown, json: boolean) {
  if (json || !process.stdout.isTTY) {
    await writeStdout(`${JSON.stringify(value, null, 2)}\n`)
  } else {
    console.log(value)
  }
}

/**
 * Runs a script with its `console.log` written to the stdout stream when that is a pipe, where
 * Bun's `console.log` would drop what the pipe does not take at once.
 */
async function withStreamedLog<T>(run: () => Promise<T>): Promise<T> {
  if (process.stdout.isTTY) return run()
  const log = console.log
  console.log = (...data: unknown[]) => {
    process.stdout.write(`${format(...data)}\n`)
  }
  try {
    return await run()
  } finally {
    console.log = log
  }
}

function serializeResult(value: unknown): unknown {
  if (value === undefined || value === null) return value
  if (typeof value === 'object' && 'toJSON' in value && typeof value.toJSON === 'function') {
    return value.toJSON()
  }
  if (Array.isArray(value)) return value.map(serializeResult)
  return value
}

function reportPreview(notice: string, args: { quiet?: boolean; json?: boolean }) {
  if (!args.quiet && !args.json) console.error(notice)
}

const designMemoryReportSchema = v.object({ designMemory: v.object({ warnings: v.string() }) })

/** Tells the person what the script brought in that the document's design memory warns about. */
function reportDesignMemory(response: unknown): void {
  const parsed = v.safeParse(designMemoryReportSchema, response)
  if (parsed.success) console.error(warn(parsed.output.designMemory.warnings))
}

export default defineCommand({
  meta: { name: 'eval', description: 'Execute JavaScript with Figma plugin API' },
  args: {
    file: {
      type: 'positional',
      description: 'Document file path (omit to connect to running app)',
      required: false
    },
    code: { type: 'string', alias: 'c', description: 'JavaScript code to execute' },
    stdin: { type: 'boolean', description: 'Read code from stdin' },
    ...documentWriteOptions,
    ...previewOptions,
    ...pageOptions('current page'),
    json: { type: 'boolean', description: 'Output as JSON' },
    quiet: { type: 'boolean', alias: 'q', description: 'Suppress output' }
  },
  async run({ args }) {
    let code = args.code

    if (args.stdin) {
      const chunks: Buffer[] = []
      for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
      code = Buffer.concat(chunks).toString('utf-8')
    }

    if (!code) {
      printError('Provide code via --code or --stdin')
      process.exit(1)
    }

    let scale = 1
    try {
      scale = previewScale(args['preview-scale'])
    } catch (error) {
      printError(error)
      process.exit(1)
    }
    if (args.output) await requireOutputDirectory(resolve(args.output))

    const preview = args['preview-output']

    if (isAppMode(args.file)) {
      const target = await appPageTargetRPCArgs(args)
      const response = await rpcResponse('eval', { code, ...target })
      const result = response.result
      reportDesignMemory(response)
      if (!args.quiet && result !== undefined && result !== null) {
        await printResult(result, !!args.json)
      }
      if (preview)
        reportPreview(await previewNotice(preview, () => appPreview(target, scale)), args)
      return
    }

    const file = requireFile(args.file)
    const { graph, figma } = await openHeadlessFigma(file, args)

    let result: unknown
    // A person runs eval, so the design memory warns about what the script brought in.
    const guard = createDesignGuard(graph, { mode: 'warn' })
    const recorder = recordDocumentChange(graph, figma.currentPageId)
    try {
      result = await withStreamedLog(() => editDocument(graph, () => compileScript(code)(figma)))
      guard.verifyChange(recorder.finish())
      reportDesignMemory({ designMemory: guard.report() })
    } catch (err) {
      recorder.finish()
      printError(err instanceof Error ? err.message : String(err))
      // Exiting at once would drop what the script logged that stdout has not taken yet.
      process.exitCode = 1
      return
    }

    if (!args.quiet && result !== undefined) {
      await printResult(serializeResult(result), !!args.json)
    }

    if (preview) {
      const render = async () => {
        // The script's API has no raster export, so a headless one draws the page it left current.
        const exporter = await createHeadlessFigma(graph)
        const page = exporter.getNodeById(figma.currentPageId)
        if (page) exporter.currentPage = page
        return headlessPreview({ graph, figma: exporter }, scale)
      }
      reportPreview(await previewNotice(preview, render), args)
    }

    if (args.write || args.output) {
      const outPath = args.output ? args.output : file
      // A script's edits that nothing read yet are laid out before saving, as Figma saves them.
      flushPendingLayout(graph)
      await writeDocumentFile(graph, outPath)
      if (!args.quiet) {
        console.error(`Written to ${outPath}`)
      }
    }
  }
})
