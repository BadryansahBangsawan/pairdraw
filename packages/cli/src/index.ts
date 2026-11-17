#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty'

import { COMMANDS } from './commands'

const { version } = await import('../package.json')

const main = defineCommand({
  meta: {
    name: 'pairdraw',
    description:
      'Pairdraw CLI — inspect, export, and lint design documents, and drive the running app',
    version
  },
  subCommands: COMMANDS
})

/**
 * `--flag -` is how the CLI spells "read this value from stdin", and citty drops the lone `-`
 * after a flag. The value is folded into the flag so every command that documents stdin gets it.
 */
export function withStdinValues(argv: string[]): string[] {
  const normalized: string[] = []
  for (const [index, value] of argv.entries()) {
    const flag = argv[index - 1]
    if (value === '-' && flag?.startsWith('--') && !flag.includes('=')) {
      normalized[normalized.length - 1] = `${flag}=-`
      continue
    }
    normalized.push(value)
  }
  return normalized
}

void runMain(main, { rawArgs: withStdinValues(process.argv.slice(2)) })
