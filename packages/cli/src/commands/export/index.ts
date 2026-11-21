import { mkdir } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'

import { defineCommand } from 'citty'
import { toUint8Array } from 'js-base64'

import { BUILTIN_IO_FORMATS, IORegistry, type ExportResult } from '@pairdraw/core/io'
import { headlessRenderThumbnail, type RasterExportFormat } from '@pairdraw/core/io/formats/raster'
import { writeFileAtomic } from '@pairdraw/core/node/fs'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { isAppMode, requireFile, rpc } from '#cli/app/client'
import { appPageTargetRPCArgs, pageOptions, requestedPage } from '#cli/app/target'
import { ok, printError, warn } from '#cli/format'
import {
  loadDocument,
  populateDocumentPage,
  populateNodePage,
  populateWholeDocument,
  requirePage
} from '#cli/headless'
import { numberInRange, outputBesideInput } from '#cli/options'

import { applyExportFontPolicy, exportFontRoots, FONT_POLICIES } from './font-policy'
import { exportStorybookFromFile } from './storybook'
import { exportVideo, VIDEO_EXPORT_FORMATS } from './video'
import { writeAndLog } from './write'

const io = new IORegistry(BUILTIN_IO_FORMATS)
// Storybook writes a folder of stories, so it stays a CLI command beside the IO formats.
const FORMAT_IDS = [...io.listExportFormats('node').map((format) => format.id), 'storybook']
const ALL_FORMATS = new Set(FORMAT_IDS.map((id) => id.toUpperCase()))
const FORMAT_LIST = `${FORMAT_IDS.slice(0, -1).join(', ')}, or ${FORMAT_IDS.at(-1)}`
// A video records the prototype through `export_video`, so it is not an IO format either.
const VIDEO_FORMAT_LIST = [...VIDEO_EXPORT_FORMATS].map((id) => id.toLowerCase()).join(', ')

function formatSupportsScale(format: string): boolean {
  return io.getFormat(format.toLowerCase())?.exportOptions?.scale ?? false
}
const THUMBNAIL_FORMATS = new Set(['PNG', 'JPG', 'WEBP'])
const JSX_STYLES = new Set(['pairdraw', 'tailwind'])
const HTML_STYLES = new Set(['inline', 'tailwind'])
const HTML_MODES = new Set(['fragment', 'standalone'])
const HTML_ASSETS = new Set(['inline', 'external'])
const HTML_FONTS = new Set(['assets', 'none'])

interface ExportArgs {
  file?: string
  output?: string
  format: string
  scale: string
  quality?: string
  page?: string
  node?: string
  style: string
  html: string
  css: string
  assets: string
  fonts?: string
  'layer-names': boolean
  'layer-ids': boolean
  framework: string
  'design-images': boolean
  watch?: boolean
  'font-policy': string
  thumbnail?: boolean
  width: string
  height: string
  'document-id'?: string
  'page-id'?: string
}

/**
 * Exits when `--node` comes with `--page` or `--page-id`, which name what to export too, or with
 * `--thumbnail`, which always renders the page.
 */
function rejectNodeWithPage(args: ExportArgs) {
  if (args.thumbnail && args.node) {
    printError('--thumbnail and --node cannot be used together.')
    process.exit(1)
  }
  if (!args.node || !requestedPage(args)) return
  printError(`${args.page ? '--page' : '--page-id'} and --node cannot be used together.`)
  process.exit(1)
}

async function appExportTarget(args: ExportArgs) {
  rejectNodeWithPage(args)
  return appPageTargetRPCArgs(args)
}

async function exportViaApp(format: string, args: ExportArgs) {
  const targetArgs = await appExportTarget(args)
  if (format === 'SVG') {
    const result = await rpc<{ svg: string }>('tool', {
      ...targetArgs,
      name: 'export_svg',
      args: { ids: args.node ? [args.node] : undefined }
    })
    if (!result.svg) {
      printError('Nothing to export.')
      process.exit(1)
    }
    await writeAndLog(resolve(args.output ?? 'export.svg'), result.svg)
    return
  }

  if (format === 'PDF') {
    const result = await rpc<{ base64: string }>('tool', {
      ...targetArgs,
      name: 'export_pdf',
      args: { ids: args.node ? [args.node] : undefined }
    })
    if (!result.base64) {
      printError('Nothing to export.')
      process.exit(1)
    }
    const data = toUint8Array(result.base64)
    await writeAndLog(resolve(args.output ?? 'export.pdf'), data)
    return
  }

  if (
    format === 'JSX' ||
    format === 'HTML' ||
    format === 'FIG' ||
    format === 'PPTX' ||
    format === 'STORYBOOK'
  ) {
    printError(`${format} export is only available in file mode right now.`)
    process.exit(1)
  }

  const result = await rpc<{ base64: string }>('export', {
    ...targetArgs,
    nodeIds: args.node ? [args.node] : undefined,
    // Without a node or a page the app exports the selection.
    scope: !args.node && targetArgs.page_id ? 'page' : undefined,
    scale: Number(args.scale),
    format: format.toLowerCase()
  })
  const data = toUint8Array(result.base64)
  const ext = format.toLowerCase() === 'jpg' ? 'jpg' : format.toLowerCase()
  await writeAndLog(resolve(args.output ?? `export.${ext}`), data)
}

function exportFileName(defaultName: string, extension: string, scale?: number): string {
  return scale ? `${defaultName}@${scale}x.${extension}` : `${defaultName}.${extension}`
}

function targetLabel(pageName?: string, nodeId?: string, wholeDocument = false): string {
  if (wholeDocument) return 'whole document'
  if (nodeId) return `node ${nodeId}`
  return pageName ? `page "${pageName}"` : 'first page'
}

type FileExportTarget = { scope: 'node'; nodeId: string } | { scope: 'page'; pageId: string }

/** Writes the export and the files it refers to, which sit next to it. */
async function writeExport(output: string, result: ExportResult) {
  await writeAndLog(output, result.data)
  const assets = result.assets ?? []
  for (const asset of assets) {
    const assetPath = join(dirname(output), asset.path)
    await mkdir(dirname(assetPath), { recursive: true })
    await writeFileAtomic(assetPath, asset.content, { symlink: 'follow' })
  }
  if (assets.length > 0) console.log(ok(`Assets: ${assets.length} files`))
}

async function prepareGraphForExport(
  graph: SceneGraph,
  pageId: string,
  format: string,
  args: ExportArgs
): Promise<boolean> {
  const wholeDocument =
    (format === 'FIG' || format === 'PPTX') && !requestedPage(args) && !args.node
  if (wholeDocument) populateWholeDocument(graph)
  else if (args.node) await populateNodePage(graph, args.node)
  else populateDocumentPage(graph, pageId)
  return wholeDocument
}

async function executeFileExport(
  formatId: string,
  graph: SceneGraph,
  target: FileExportTarget,
  options: unknown,
  wholeDocument: boolean,
  fileName: string
) {
  if (wholeDocument)
    return io.exportContent(formatId, { graph, target: { scope: 'document' }, fileName }, options)
  return io.exportContent(formatId, { graph, target, fileName }, options)
}

function exportOptions(format: string, args: ExportArgs): unknown {
  if (format === 'FIG') return { renderThumbnail: true }
  if (format === 'HTML')
    return {
      html: args.html,
      style: args.css,
      assets: args.assets,
      fonts: args.fonts ?? 'none',
      layerNames: args['layer-names'],
      layerIds: args['layer-ids']
    }
  if (formatSupportsScale(format))
    return {
      format,
      scale: numberInRange('scale', Number(args.scale), 0.01, 16),
      quality: args.quality ? numberInRange('quality', Number(args.quality), 0, 100) : undefined
    }
  return undefined
}

async function exportFromFile(format: string, args: ExportArgs) {
  const file = requireFile(args.file)
  const graph = await loadDocument(file)
  const pages = graph.getPages()
  rejectNodeWithPage(args)
  const requested = requestedPage(args)
  const page = requirePage(graph, requested)

  const defaultName = basename(file, extname(file))

  const wholeDocument = await prepareGraphForExport(graph, page.id, format, args)

  const target = args.node
    ? { scope: 'node' as const, nodeId: args.node }
    : { scope: 'page' as const, pageId: page.id }
  await applyExportFontPolicy(
    graph,
    exportFontRoots(
      args.node,
      page.id,
      pages.map((candidate) => candidate.id),
      wholeDocument
    ),
    format,
    args['font-policy']
  )

  if (args.thumbnail) {
    if (!THUMBNAIL_FORMATS.has(format)) {
      printError(`--thumbnail writes PNG, JPG, or WEBP, not ${format.toLowerCase()}.`)
      process.exit(1)
    }
    const image = await headlessRenderThumbnail(
      graph,
      page.id,
      numberInRange('width', Number(args.width), 1, 8192),
      numberInRange('height', Number(args.height), 1, 8192),
      format as RasterExportFormat,
      args.quality ? numberInRange('quality', Number(args.quality), 0, 100) : 100
    )
    if (!image) {
      printError('The page has nothing to draw as a thumbnail.')
      process.exit(1)
    }
    const extension = io.getFormat(format.toLowerCase())?.extensions[0] ?? format.toLowerCase()
    await writeAndLog(
      outputBesideInput(
        resolve(args.output ?? join(dirname(file), exportFileName(defaultName, extension))),
        file
      ),
      image
    )
    console.log(ok(`Target: ${targetLabel(requested && page.name, args.node, wholeDocument)}`))
    return
  }

  // `--style tailwind` keeps the JSX spelling of the Tailwind JSX format.
  const formatId =
    format === 'JSX' && args.style === 'tailwind' ? 'tailwind-jsx' : format.toLowerCase()
  const scale = formatSupportsScale(format) ? Number(args.scale) : undefined
  const extension = io.getFormat(formatId)?.extensions[0] ?? formatId
  const output = outputBesideInput(
    resolve(args.output ?? join(dirname(file), exportFileName(defaultName, extension, scale))),
    file
  )
  const result = await executeFileExport(
    formatId,
    graph,
    target,
    exportOptions(format, args),
    wholeDocument,
    basename(output)
  )
  for (const message of result.warnings ?? []) console.error(warn(message))
  await writeExport(output, result)
  console.log(ok(`Target: ${targetLabel(requested && page.name, args.node, wholeDocument)}`))
}

export default defineCommand({
  meta: { name: 'export', description: `Export a document to ${FORMAT_LIST}` },
  args: {
    file: {
      type: 'positional',
      description:
        'Document file path (omit to connect to running app); for storybook, several files or a quoted glob',
      required: false
    },
    output: {
      type: 'string',
      alias: 'o',
      description:
        'Output file path (default: <name>.<format>); for storybook, a directory (default: <name>-stories)',
      required: false
    },
    format: {
      type: 'string',
      alias: 'f',
      description: `Export format: ${FORMAT_IDS.join(', ')}; a prototype video: ${VIDEO_FORMAT_LIST} (default: png)`,
      default: 'png'
    },
    scale: { type: 'string', alias: 's', description: 'Export scale (default: 1)', default: '1' },
    quality: {
      type: 'string',
      alias: 'q',
      description: 'Quality 0-100 for JPG/WEBP (default: 90)',
      required: false
    },
    ...pageOptions('first page; FIG, PPTX, and Storybook export the whole document'),
    node: {
      type: 'string',
      description: 'Export a specific node by ID (cannot be combined with --page or --page-id)',
      required: false
    },
    style: {
      type: 'string',
      description: 'JSX style: pairdraw or tailwind (default: pairdraw)',
      default: 'pairdraw'
    },
    html: {
      type: 'string',
      description: 'HTML output mode: fragment or standalone (default: fragment)',
      default: 'fragment'
    },
    css: {
      type: 'string',
      description:
        'CSS output: inline or tailwind; for Storybook, how Vue and React components are styled (default: inline)',
      default: 'inline'
    },
    assets: {
      type: 'string',
      description: 'HTML asset output: inline or external (default: inline)',
      default: 'inline'
    },
    fonts: {
      type: 'string',
      description:
        'HTML and Storybook font files: assets or none (default: none for HTML, assets for Storybook)'
    },
    'layer-names': {
      type: 'boolean',
      description: 'HTML: write each layer name as a data-name attribute (default: true)',
      default: true
    },
    'layer-ids': {
      type: 'boolean',
      description:
        'HTML: write each layer ID as a data-pairdraw-node-id attribute (default: false)',
      default: false
    },
    framework: {
      type: 'string',
      description: 'Storybook framework: react, vue, or html (default: react)',
      default: 'react'
    },
    'design-images': {
      type: 'boolean',
      description: 'Storybook: render each variant to PNG for the Design panel (default: true)',
      default: true
    },
    watch: {
      type: 'boolean',
      description: 'Storybook: re-export whenever the document changes'
    },
    beside: {
      type: 'boolean',
      description: "Storybook: write each document's stories into the document's own folder"
    },
    rules: {
      type: 'string',
      description:
        'Storybook: rules file for which stories each component gets and its title (default: pairdraw.stories.json when present)'
    },
    'font-policy': {
      type: 'string',
      description: 'Raster/PDF font policy: warn, strict, or allow (default: warn)',
      default: 'warn'
    },
    thumbnail: { type: 'boolean', description: 'Export page thumbnail instead of full render' },
    start: {
      type: 'string',
      description:
        'Video: top-level frame name or ID to play from (default: the selected or first frame)'
    },
    fps: { type: 'string', description: 'Video: frames per second (default: 15 for GIF)' },
    'max-edge': {
      type: 'string',
      description: 'Video: longest width or height in pixels (default: 960 for GIF)'
    },
    'max-duration': {
      type: 'string',
      description: 'Video: seconds the clip may last at most (default: 30)'
    },
    tail: {
      type: 'string',
      description: 'Video: seconds the last frame stays when the flow ends (default: 1)'
    },
    click: {
      type: 'string',
      description: 'Video: a click to run, <seconds>:<layer name or ID>; repeat for more'
    },
    width: { type: 'string', description: 'Thumbnail width (default: 1920)', default: '1920' },
    height: { type: 'string', description: 'Thumbnail height (default: 1080)', default: '1080' }
  },
  async run({ args }) {
    const format = args.format.toUpperCase()
    // Storybook takes the files a shell expanded; every other export writes one document.
    if (format !== 'STORYBOOK' && args._.length > 1) {
      throw new Error(`Unexpected argument: ${args._.slice(1).join(' ')}`)
    }
    if (VIDEO_EXPORT_FORMATS.has(format)) {
      await exportVideo(format, args)
      return
    }
    if (!ALL_FORMATS.has(format)) {
      printError(`Invalid format "${args.format}". Use ${FORMAT_LIST}, or ${VIDEO_FORMAT_LIST}.`)
      process.exit(1)
    }

    if (format === 'JSX' && !JSX_STYLES.has(args.style)) {
      printError(`Invalid JSX style "${args.style}". Use pairdraw or tailwind.`)
      process.exit(1)
    }

    if (format === 'HTML' && !HTML_MODES.has(args.html)) {
      printError(`Invalid HTML mode "${args.html}". Use fragment or standalone.`)
      process.exit(1)
    }

    if (format === 'HTML' && !HTML_STYLES.has(args.css)) {
      printError(`Invalid HTML CSS output "${args.css}". Use inline or tailwind.`)
      process.exit(1)
    }

    if (format === 'HTML' && !HTML_ASSETS.has(args.assets)) {
      printError(`Invalid HTML asset output "${args.assets}". Use inline or external.`)
      process.exit(1)
    }

    if (args.fonts && !HTML_FONTS.has(args.fonts)) {
      printError(`Invalid font output "${args.fonts}". Use assets or none.`)
      process.exit(1)
    }

    if (!FONT_POLICIES.has(args['font-policy'])) {
      printError(`Invalid font policy "${args['font-policy']}". Use warn, strict, or allow.`)
      process.exit(1)
    }

    if (isAppMode(args.file)) {
      await exportViaApp(format, args)
    } else if (format === 'STORYBOOK') {
      await exportStorybookFromFile(args)
    } else {
      await exportFromFile(format, args)
    }
  }
})
