import { basename, dirname, extname, join, resolve } from 'node:path'

import { toUint8Array } from 'js-base64'

import type { PageCLIArgs } from '#cli/app/target'
import { dim, printError } from '#cli/format'
import { outputBesideInput } from '#cli/options'
import { runToolData } from '#cli/tool-data'

import { writeAndLog } from './write'

/** Formats `export` records a prototype to, upper-cased as `export` compares formats. */
export const VIDEO_EXPORT_FORMATS: ReadonlySet<string> = new Set(['MP4', 'GIF', 'WEBM'])

export interface VideoExportArgs extends PageCLIArgs {
  file?: string
  output?: string
  scale: string
  start?: string
  fps?: string
  'max-edge'?: string
  'max-duration'?: string
  tail?: string
  click?: string | string[]
  thumbnail?: boolean
  node?: string
}

interface VideoResult {
  base64?: string
  error?: string
  width: number
  height: number
  fps: number
  durationMs: number
  frameCount: number
  loops: boolean
  truncated: boolean
  steps: { at: number; frame: string; trigger: string; transition: string }[]
}

function fail(message: string): never {
  printError(message)
  process.exit(1)
}

function optionalNumber(flag: string, value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const number = Number(value)
  if (!Number.isFinite(number)) fail(`--${flag} must be a number, not "${value}".`)
  return number
}

/** `--click 2.5:Buy` as a click on the layer named or with ID `Buy` 2.5 s into play. */
function parseClicks(value: string | string[] | undefined): { at: number; node: string }[] {
  // Repeating a flag gives its values as a list.
  let entries: string[] = []
  if (Array.isArray(value)) entries = value
  else if (value !== undefined) entries = [value]
  return entries.map((entry) => {
    const separator = entry.indexOf(':')
    const at = Number(entry.slice(0, separator))
    const node = entry.slice(separator + 1)
    if (separator <= 0 || !Number.isFinite(at) || node.length === 0) {
      fail(`--click takes <seconds>:<layer>, such as 2.5:Buy, not "${entry}".`)
    }
    return { at, node }
  })
}

/** Records the prototype on the page as a video through `export_video` and writes the file. */
export async function exportVideo(format: string, args: VideoExportArgs): Promise<void> {
  if (args.thumbnail || args.node) {
    fail(`${args.thumbnail ? '--thumbnail' : '--node'} does not apply to a video.`)
  }
  const extension = format.toLowerCase()
  // An option left out stays undefined, which the tool reads as its default.
  const toolArgs = {
    format: extension,
    scale: Number(args.scale),
    start: args.start,
    fps: optionalNumber('fps', args.fps),
    maxEdge: optionalNumber('max-edge', args['max-edge']),
    maxDuration: optionalNumber('max-duration', args['max-duration']),
    tail: optionalNumber('tail', args.tail),
    clicks: args.click === undefined ? undefined : parseClicks(args.click)
  }
  const { result } = await runToolData(args.file, 'export_video', toolArgs, args)
  const video = result as VideoResult
  if (video.error) fail(video.error)
  if (!video.base64) fail('The recording returned no file.')

  const output = args.file
    ? outputBesideInput(
        resolve(
          args.output ??
            join(dirname(args.file), `${basename(args.file, extname(args.file))}.${extension}`)
        ),
        args.file
      )
    : resolve(args.output ?? `prototype.${extension}`)
  await writeAndLog(output, toUint8Array(video.base64))
  for (const step of video.steps) {
    console.log(
      dim(`  ${step.at.toFixed(2)} s  ${step.frame}  (${step.trigger}, ${step.transition})`)
    )
  }
  let ending = 'ends'
  if (video.loops) ending = 'loops'
  else if (video.truncated) ending = 'stops at the cap'
  console.log(
    dim(
      `  ${video.width}×${video.height} · ${video.fps} fps · ${(video.durationMs / 1000).toFixed(2)} s · ${video.frameCount} frames · ${ending}`
    )
  )
}
