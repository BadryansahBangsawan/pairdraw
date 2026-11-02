import { readFile } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

import * as v from 'valibot'

/**
 * Which cloud Claude Code is set up to use instead of an Anthropic sign-in: Amazon Bedrock,
 * Google Vertex AI, or Microsoft Foundry, chosen by `CLAUDE_CODE_USE_*` switches. The desktop
 * shell reads the same switches in `desktop/src/agents/claude_cloud.rs`.
 */
export type ClaudeCodeCloud = 'bedrock' | 'vertex' | 'foundry'

/** The switches in the order Claude Code checks them. */
const SWITCHES = [
  ['CLAUDE_CODE_USE_BEDROCK', 'bedrock'],
  ['CLAUDE_CODE_USE_VERTEX', 'vertex'],
  ['CLAUDE_CODE_USE_FOUNDRY', 'foundry']
] as const satisfies readonly (readonly [string, ClaudeCodeCloud])[]

type SwitchName = (typeof SWITCHES)[number][0]

/** Reads one variable from a place Claude Code takes its switches from. */
export type SwitchSource = (name: SwitchName) => string | undefined

const switchValueSchema = v.union([
  v.string(),
  v.pipe(v.boolean(), v.toString()),
  v.pipe(v.number(), v.toString())
])

// Only the switches are kept; other variables, which may hold keys, are dropped while parsing.
const claudeSettingsSchema = v.object({
  env: v.optional(
    v.object({
      CLAUDE_CODE_USE_BEDROCK: v.optional(v.fallback(switchValueSchema, '')),
      CLAUDE_CODE_USE_VERTEX: v.optional(v.fallback(switchValueSchema, '')),
      CLAUDE_CODE_USE_FOUNDRY: v.optional(v.fallback(switchValueSchema, ''))
    })
  )
})

/** Claude Code turns a switch on for `1`, `true`, `yes`, or `on`, in any case. */
function isOn(value: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

/**
 * The cloud the first switch that is on names. Settings override the environment, and managed
 * settings override the user's, so `sources` lists the most specific source first.
 */
export function cloudFrom(sources: readonly SwitchSource[]): ClaudeCodeCloud | null {
  for (const [name, cloud] of SWITCHES) {
    const value = sources.map((source) => source(name)).find((found) => found !== undefined)
    if (value !== undefined && isOn(value)) return cloud
  }
  return null
}

/** The switches a settings file sets; nothing for a missing, unreadable, or malformed file. */
export async function settingsSwitches(path: string): Promise<SwitchSource> {
  const text = await readFile(path, 'utf8').catch(() => null)
  const parsed =
    text === null
      ? null
      : v.safeParse(v.pipe(v.string(), v.parseJson(), claudeSettingsSchema), text)
  const env = parsed?.success ? parsed.output.env : undefined
  return (name) => env?.[name]
}

function managedSettings(runtimePlatform: NodeJS.Platform): string | null {
  if (runtimePlatform === 'darwin') {
    return '/Library/Application Support/ClaudeCode/managed-settings.json'
  }
  if (runtimePlatform === 'win32') return 'C:\\Program Files\\ClaudeCode\\managed-settings.json'
  if (runtimePlatform === 'linux') return '/etc/claude-code/managed-settings.json'
  return null
}

/** The user's settings, in `CLAUDE_CONFIG_DIR` when that names another folder. */
function userSettings(env: NodeJS.ProcessEnv): string {
  return join(env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'settings.json')
}

/**
 * The cloud Claude Code on this computer is set up to use, from the environment the companion
 * starts agents with and Claude Code's managed and user settings; null when it signs in itself.
 */
export async function claudeCodeCloud(
  env: NodeJS.ProcessEnv = process.env,
  runtimePlatform: NodeJS.Platform = platform()
): Promise<ClaudeCodeCloud | null> {
  const managed = managedSettings(runtimePlatform)
  const sources = await Promise.all([
    managed ? settingsSwitches(managed) : () => undefined,
    settingsSwitches(userSettings(env))
  ])
  return cloudFrom([...sources, (name) => env[name]])
}
