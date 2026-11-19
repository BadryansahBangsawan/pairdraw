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

/**
 * Commands that read positionals no argument claims: `export` takes several files for storybook,
 * and `export storybook` is the subcommand that documents them. `export` checks its own extras.
 */
const VARIADIC_COMMANDS = new Set(['export', 'storybook'])

/** A command this file defines directly, rather than one a module resolves on demand. */
function isCommand(value: unknown): value is CommandDef {
  return !!value && typeof value === 'object' && !(value instanceof Promise)
}

/** Every option spelling a command declares, mapped to whether it reads a value. */
function declaredOptions(command: CommandDef): Map<string, boolean> {
  const options = new Map<string, boolean>()
  const args = command.args
  if (!args || typeof args !== 'object' || args instanceof Promise) return options
  for (const [key, arg] of Object.entries(args)) {
    if (arg instanceof Promise || typeof arg !== 'object' || arg.type === 'positional') continue
    const takesValue = arg.type !== 'boolean'
    options.set(`--${key}`, takesValue)
    if (!takesValue) options.set(`--no-${key}`, false)
    const alias = 'alias' in arg ? arg.alias : undefined
    for (const name of typeof alias === 'string' ? [alias] : (alias ?? [])) {
      options.set(`-${name}`, takesValue)
    }
  }
  return options
}

/**
 * Checks one raw token against the declared options, the way citty tokenizes it: a long or
 * `--no-` form is one flag, a short form is one flag per letter, and only a value-taking flag
 * whose value is not attached reads the next token, and only when it does not start with a dash.
 * Returns whether the next token was read as this flag's value.
 */
function checkOptionToken(
  token: string,
  next: string | undefined,
  declared: Map<string, boolean>
): boolean {
  const dashes = token.startsWith('--') ? 2 : 1
  const body = token.slice(dashes)
  const equals = body.indexOf('=')
  const name = equals === -1 ? body : body.slice(0, equals)
  const readsNext = equals === -1 && next !== undefined && !next.startsWith('-')
  const flags =
    dashes === 2 || name.startsWith('no-')
      ? [`--${name}`]
      : // Option letters are ASCII; code units match citty's charCodeAt loop.
        // eslint-disable-next-line typescript/no-misused-spread -- ASCII flag letters
        [...name].map((letter) => `-${letter}`)
  for (const flag of flags) {
    if (!declared.has(flag)) throw new Error(`Unknown option: ${flag}`)
  }
  const last = flags.at(-1)
  return readsNext && last !== undefined && declared.get(last) === true
}

/**
 * Refuses an option the command does not declare, which citty would otherwise drop: `tree -q`
 * and `info --jsonn` printed the human output a script then failed to read.
 */
function refuseUnknownOptions(command: CommandDef): void {
  const run = command.run
  if (!run) return
  const declared = declaredOptions(command)
  command.run = (context) => {
    const tokens = context.rawArgs
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index]
      if (token === '--') break
      if (!token.startsWith('-') || token === '-' || /^-\d/.test(token)) continue
      if (checkOptionToken(token, tokens[index + 1], declared)) index++
    }
    return run(context)
  }
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
    if (run && !VARIADIC_COMMANDS.has(name ?? '')) {
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
      if (isCommand(child)) {
        refuseExtraPositionals(child)
        refuseUnknownOptions(child)
      }
    }
  }
}

refuseExtraPositionals(main)
refuseUnknownOptions(main)

void runMain(main, { rawArgs: withStdinValues(process.argv.slice(2)) })
