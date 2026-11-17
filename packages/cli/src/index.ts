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
 * `--flag -` reads the value from stdin, and `--flag -5` is a negative number; citty takes both
 * as a flag of their own and drops them. A value that starts with a dash and is not a value the
 * CLI documents as a flag is folded into the flag before it.
 */
export function withStdinValues(argv: string[]): string[] {
  const normalized: string[] = []
  for (const [index, value] of argv.entries()) {
    const flag = argv[index - 1]
    const isValue = value === '-' || /^-\d/.test(value)
    if (isValue && flag?.startsWith('--') && !flag.includes('=')) {
      normalized[normalized.length - 1] = `${flag}=${value}`
      continue
    }
    normalized.push(value)
  }
  return normalized
}

void runMain(main, { rawArgs: withStdinValues(process.argv.slice(2)) })
