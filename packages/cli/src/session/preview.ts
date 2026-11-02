import { resolve } from 'node:path'

import { isValid, toUint8Array } from 'js-base64'
import * as v from 'valibot'

import { writeFileAtomic } from '@open-pencil/core/node/fs'

import { rpc } from '#cli/app/client'
import { dim, warn } from '#cli/format'
import { toolErrorMessage } from '#cli/session/tools'

/** `--preview-output` and `--preview-scale` for commands that change a document. */
export const previewOptions = {
  'preview-output': {
    type: 'string',
    description: 'Write a PNG of the current page to this path after each change',
    required: false
  },
  'preview-scale': {
    type: 'string',
    description:
      'Scale of the preview PNG, from 0.1 to 4 (default: 1); the longest edge stays within 1280 pixels',
    default: '1'
  }
} as const

/** The preview scale a command was given, refusing one the renderer would not draw. */
export function previewScale(value: string | undefined): number {
  const scale = Number(value ?? '1')
  if (!Number.isFinite(scale) || scale < 0.1 || scale > 4) {
    throw new Error('--preview-scale must be a number from 0.1 to 4')
  }
  return scale
}

const imageResultSchema = v.looseObject({ base64: v.string() })

/** The PNG an `export_image` result carries, or the error it reports instead. */
export function previewImage(result: unknown): Uint8Array {
  const error = toolErrorMessage(result)
  if (error) throw new Error(error)
  const image = v.safeParse(imageResultSchema, result)
  if (!image.success || !isValid(image.output.base64)) {
    throw new Error('export_image returned no preview image')
  }
  return toUint8Array(image.output.base64)
}

/**
 * Previews run `export_image` on the whole current page, headlessly and in the running app alike.
 * The tool keeps the longest edge within its default maximum, so a large page still gives a
 * bounded PNG, and it tells an empty page apart from one the renderer could not draw.
 */
export const PREVIEW_TOOL = 'export_image'

export function previewArgs(scale: number): Record<string, unknown> {
  return { format: 'PNG', scale }
}

/** A PNG of the page current in the running app, or in the document `target` names. */
export async function appPreview(
  target: Record<string, unknown>,
  scale: number
): Promise<Uint8Array> {
  const args = previewArgs(scale)
  return previewImage(await rpc('tool', { ...target, name: PREVIEW_TOOL, args }))
}

/** Renders a preview and writes it to `path`, returning the absolute path written. */
export async function writePreview(
  path: string,
  render: () => Promise<Uint8Array>
): Promise<string> {
  const output = resolve(path)
  await writeFileAtomic(output, await render())
  return output
}

/**
 * Writes a preview after a change and returns the line to report. The change stands even when the
 * page cannot be drawn, so a failure is a warning rather than an error.
 */
export async function previewNotice(
  path: string,
  render: () => Promise<Uint8Array>
): Promise<string> {
  try {
    return dim(`Preview: ${await writePreview(path, render)}`)
  } catch (error) {
    return warn(`No preview: ${error instanceof Error ? error.message : String(error)}`)
  }
}
