import { readFile } from 'node:fs/promises'

import * as v from 'valibot'

/** Where `pairdraw check` reads its settings when `--config` names no other file. */
export const DEFAULT_CHECK_CONFIG_PATH = '.pairdraw/check.json'

/** The findings a run fails on: everything, warnings too, or nothing. */
export const CHECK_FAIL_LEVELS = ['error', 'warning', 'never'] as const
export type CheckFailLevel = (typeof CHECK_FAIL_LEVELS)[number]

export interface CheckConfig {
  checks: { responsive: boolean; designMemory: boolean; tokens: boolean }
  responsive: {
    widths: number[]
    maxFrames: number
    maxWarnings: number
    scale: number
    maxEdge: number
  }
  tokens: { source: string | null }
  failOn: CheckFailLevel
}

/** What a document is checked for when it names no configuration of its own. */
export const defaultCheckConfig: CheckConfig = {
  checks: { responsive: true, designMemory: true, tokens: true },
  responsive: { widths: [375, 768, 1280], maxFrames: 8, maxWarnings: 20, scale: 1, maxEdge: 1280 },
  tokens: { source: null },
  failOn: 'error'
}

const widthSchema = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(4096))

const configSchema = v.strictObject({
  checks: v.optional(
    v.strictObject({
      responsive: v.optional(v.boolean()),
      designMemory: v.optional(v.boolean()),
      tokens: v.optional(v.boolean())
    })
  ),
  responsive: v.optional(
    v.strictObject({
      widths: v.optional(
        v.pipe(
          v.array(widthSchema),
          v.minLength(1),
          v.maxLength(12),
          v.description('Viewport widths to render each frame at')
        )
      ),
      maxFrames: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50))),
      maxWarnings: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(200))),
      scale: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(4))),
      maxEdge: v.optional(v.pipe(v.number(), v.integer(), v.minValue(64), v.maxValue(4096)))
    })
  ),
  tokens: v.optional(
    v.strictObject({
      source: v.optional(v.pipe(v.string(), v.trim(), v.nonEmpty()))
    })
  ),
  failOn: v.optional(v.picklist(CHECK_FAIL_LEVELS))
})

/**
 * The settings a run uses: the file's own fields over the defaults. A missing file is the
 * defaults; a file that is not JSON or names a field this schema does not have is refused, so a
 * typo cannot silently turn a check off.
 */
export async function readCheckConfig(path = DEFAULT_CHECK_CONFIG_PATH): Promise<CheckConfig> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (isMissingFile(error)) return structuredClone(defaultCheckConfig)
    throw error
  }
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), configSchema), text)
  if (!parsed.success) {
    throw new Error(`${path} is not a valid check configuration: ${v.summarize(parsed.issues)}`)
  }
  const config = parsed.output
  return {
    checks: { ...defaultCheckConfig.checks, ...config.checks },
    responsive: { ...defaultCheckConfig.responsive, ...config.responsive },
    tokens: { source: config.tokens ? (config.tokens.source ?? null) : null },
    failOn: config.failOn ?? defaultCheckConfig.failOn
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
