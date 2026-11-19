import { createInterface, type Completer, type Interface } from 'node:readline'

import { defineCommand } from 'citty'

import { appTargetOptions } from '#cli/app/target'
import { dim, printError, writeStdout } from '#cli/format'
import { openToolSession } from '#cli/session/open'
import { previewOptions, previewScale } from '#cli/session/preview'
import { CLI_TOOLS } from '#cli/session/tools'
import { SHELL_BUILTINS } from '#cli/shell/parse'
import { createShell, runShell, type Shell, type ShellOptions } from '#cli/shell/run'

const COMPLETIONS = [
  ...SHELL_BUILTINS.map((name) => `${name}(`),
  ...CLI_TOOLS.map((def) => def.name)
]

/** Completes the tool or command name at the start of a line. */
const completeName: Completer = (line) => {
  if (/\s|\(/.test(line.trimStart())) return [[], line]
  const typed = line.trimStart()
  const hits = COMPLETIONS.filter((name) => name.startsWith(typed))
  return [hits.length > 0 ? hits : COMPLETIONS, typed]
}

/** Empties the line being typed, as Ctrl+E then Ctrl+U would. */
function clearLine(rl: Interface): void {
  rl.write(null, { ctrl: true, name: 'e' })
  rl.write(null, { ctrl: true, name: 'u' })
}

/**
 * Reads commands from the terminal until the shell stops. Ctrl+C clears a half-typed line; on an
 * empty line it leaves as `exit()` does, and so does Ctrl+D, which ends the input: with unsaved
 * changes both warn once, and the terminal is read again.
 */
async function runTerminal(shell: Shell, prompt: string): Promise<void> {
  for (;;) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      completer: completeName
    })
    rl.setPrompt(prompt)
    // The SIGINT handler sets it, which a `let` would hide from narrowing.
    const ended = { byUser: false }
    rl.on('SIGINT', () => {
      if (rl.line.length > 0) {
        clearLine(rl)
        return
      }
      process.stdout.write('\n')
      if (!shell.leave('Ctrl+C')) {
        rl.prompt()
        return
      }
      ended.byUser = true
      rl.close()
    })
    rl.prompt()
    let stopped = false
    for await (const text of rl) {
      if (await shell.line(text)) {
        stopped = true
        break
      }
      rl.prompt()
    }
    rl.close()
    if (stopped || ended.byUser || process.stdin.readableEnded) return
    // Ctrl+D on an empty line closed the interface.
    process.stdout.write('\n')
    if (shell.leave('Ctrl+D')) return
  }
}

export default defineCommand({
  meta: {
    name: 'shell',
    description:
      'Open a document once and run tools on it line by line, with save() and exit(); reads commands from stdin when it is not a terminal'
  },
  args: {
    file: {
      type: 'positional',
      description: 'Document file path (omit to connect to running app)',
      required: false
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Where save() writes without a path (default: the input file)',
      required: false
    },
    ...previewOptions,
    ...appTargetOptions
  },
  async run({ args }) {
    const interactive = process.stdin.isTTY
    try {
      const scale = previewScale(args['preview-scale'])
      if (!args.file && args.output) {
        throw new Error('--output needs a document file; in the running app, use save("path.fig")')
      }
      const session = await openToolSession(args.file, args)
      const output = {
        out: (text: string) => void writeStdout(`${text}\n`),
        err: (text: string) => console.error(text)
      }
      const options: ShellOptions = {
        savePath: args.output || args.file || undefined,
        previewOutput: args['preview-output'],
        previewScale: scale,
        interactive
      }
      if (interactive) {
        console.log(dim(`Opened ${session.label}. Type help() for commands, exit() to leave.`))
        const shell = createShell(session, output, options)
        await runTerminal(shell, `${session.label}> `)
        shell.finish()
        return
      }
      const rl = createInterface({ input: process.stdin, terminal: false })
      const result = await runShell(session, rl, output, options)
      rl.close()
      // A script piped in fails as a whole when one of its lines failed.
      if (result.failures > 0) process.exit(1)
    } catch (error) {
      printError(error)
      process.exit(1)
    }
  }
})
