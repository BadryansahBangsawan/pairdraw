import { describe, expect, test } from 'bun:test'

import { type CommandDef, renderUsage, type Resolvable, type SubCommandsDef } from 'citty'

import { COMMANDS } from '#cli/commands'

function resolve<T>(value: Resolvable<T>): Promise<T> {
  return Promise.resolve(typeof value === 'function' ? (value as () => T | Promise<T>)() : value)
}

const ROOT: CommandDef = { meta: { name: 'pairdraw' } }
// The root command takes the map as citty types it, as `pairdraw` itself does.
const commands: SubCommandsDef = COMMANDS

describe('command help', () => {
  // Without a name of its own, citty prints the script path where a command's name belongs.
  test('names every command and subcommand on its usage line', async () => {
    const missing: string[] = []
    for (const [name, entry] of Object.entries(commands)) {
      const command = await resolve<CommandDef>(entry)
      const usage = await renderUsage(command, ROOT)
      if (!usage.includes(`USAGE \`pairdraw ${name} `)) missing.push(name)
      const subCommands = command.subCommands ? await resolve(command.subCommands) : {}
      for (const [subName, subEntry] of Object.entries(subCommands)) {
        const subUsage = await renderUsage(await resolve<CommandDef>(subEntry), command)
        if (!subUsage.includes(`USAGE \`${name} ${subName} `)) missing.push(`${name} ${subName}`)
      }
    }
    expect(missing).toEqual([])
  })
})
