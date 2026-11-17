#!/usr/bin/env bun
import { defineCommand, runMain, type CommandDef } from 'citty'

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
    if (isValue && flag.startsWith('--') && !flag.includes('=')) {
      normalized[normalized.length - 1] = `${flag}=${value}`
      continue
    }
    normalized.push(value)
  }
  return normalized
}

/** The one subcommand that reads positionals no argument claims: `export storybook` takes files. */
const VARIADIC_COMMAND = 'storybook'

/** A command this file defines directly, rather than one a module resolves on demand. */
function isCommand(value: unknown): value is CommandDef {
  return !!value && typeof value === 'object' && !(value instanceof Promise)
}

/**
 * Refuses a positional no argument of the command claims, which citty would otherwise fold into
 * `args._` and drop: `tree a.fig b.fig` looked like it read one file.
 */
function refuseExtraPositionals(command: CommandDef): void {
  const args = command.args
  if (args && typeof args === 'object' && !(args instanceof Promise)) {
    const declared = Object.values(args).filter((arg) => arg.type === 'positional').length
    const meta = command.meta
    const name =
      meta && !(meta instanceof Promise) && typeof meta !== 'function' ? meta.name : undefined
    const run = command.run
    if (run && name !== VARIADIC_COMMAND) {
      command.run = (context) => {
        const extra = context.args._.slice(declared)
        if (extra.length > 0) {
          const noun = extra.length === 1 ? 'argument' : 'arguments'
          throw new Error(`Unexpected ${noun}: ${extra.join(' ')}`)
        }
        return run(context)
      }
    }
  }
  const subCommands = command.subCommands
  if (subCommands && typeof subCommands === 'object' && !(subCommands instanceof Promise)) {
    for (const child of Object.values(subCommands)) {
      if (isCommand(child)) refuseExtraPositionals(child)
    }
  }
}

refuseExtraPositionals(main)

void runMain(main, { rawArgs: withStdinValues(process.argv.slice(2)) })
