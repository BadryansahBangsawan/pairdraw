import { basename, extname } from 'node:path'

import { toolChangesDocument, type ToolDef } from '@pairdraw/core/tools'

import { bold, dim, fail, fmtList, ok, warn } from '#cli/format'
import type { ToolSession } from '#cli/session/open'
import { previewNotice, writePreview } from '#cli/session/preview'
import {
  findCLITool,
  formatToolList,
  formatToolResult,
  toolErrorMessage,
  toolHeader
} from '#cli/session/tools'
import { parseShellLine, type ShellCommand } from '#cli/shell/parse'

/** Where the shell writes: results to `out`, notices and errors to `err`. */
export interface ShellOutput {
  out(text: string): void
  err(text: string): void
}

export interface ShellOptions {
  /** Where `save()` writes when it is given no path. */
  savePath?: string
  /** Where a PNG of the current page is written after each change. */
  previewOutput?: string
  previewScale: number
  /** An interactive shell asks a second time before `exit()`, Ctrl+C or Ctrl+D discards changes. */
  interactive: boolean
}

export interface ShellResult {
  /** Lines that failed: a parse error, an unknown tool, or a call or save that threw. */
  failures: number
  /** The headless document changed after it was last saved. */
  unsaved: boolean
}

const HELP = fmtList(
  [
    { header: '<tool> {"arg": "value"}', about: 'run a tool, also written <tool>({...})' },
    { header: 'tools()', about: 'list the tools' },
    { header: 'help("<tool>")', about: "show a tool's description" },
    { header: 'save()', about: 'save the document as .fig; save("path.fig") saves a copy' },
    { header: 'preview()', about: 'write a PNG of the current page; preview("path.png")' },
    { header: 'exit()', about: 'leave the shell; Ctrl+C clears the line, then leaves' }
  ].map(({ header, about }) => ({ header: bold(header), details: [about] })),
  { numbered: false, compact: true }
)

function requireFigPath(path: string): string {
  const extension = extname(path)
  if (extension.toLowerCase() !== '.fig') {
    const suggestion = `${basename(path, extension)}.fig`
    throw new Error(`save() writes a .fig file; pass a path such as save("${suggestion}")`)
  }
  return path
}

function findTool(name: string): ToolDef {
  return findCLITool(name, 'Type tools() to list them.')
}

function toolHelp(name: string): string {
  const def = findTool(name)
  return fmtList([{ header: toolHeader(def), details: { about: def.description } }])
}

/** How the user asked to leave: the `exit()` command, or Ctrl+C or Ctrl+D on an empty line. */
type ShellLeave = 'exit()' | 'Ctrl+C' | 'Ctrl+D'

/** One open shell, fed a line at a time by `runShell` or by a terminal. */
export interface Shell {
  /** Runs one line, reporting its error so the shell goes on; `true` when the shell should stop. */
  line(text: string): Promise<boolean>
  /**
   * Asks to leave. An interactive shell with unsaved headless changes warns and refuses once;
   * asking again in any of the ways, with no command between, discards them.
   */
  leave(how: ShellLeave): boolean
  /** Ends the session, warning when its changes were not saved. */
  finish(): ShellResult
}

/** A shell over one open document. A failing line prints its error and the shell goes on. */
export function createShell(
  session: ToolSession,
  output: ShellOutput,
  options: ShellOptions
): Shell {
  // Closures below update it, which a `let` would hide from narrowing.
  const state: ShellResult & { leaveRequested: boolean } = {
    failures: 0,
    unsaved: false,
    leaveRequested: false
  }
  const render = () => session.preview(options.previewScale)

  async function call(name: string, args: Record<string, unknown>): Promise<void> {
    const def = findTool(name)
    const result = await session.call(def, args)
    output.out(formatToolResult(result))
    const error = toolErrorMessage(result)
    if (error !== null) {
      state.failures++
      return
    }
    if (!toolChangesDocument(def)) return
    if (session.graph) state.unsaved = true
    if (!options.previewOutput) return
    output.err(await previewNotice(options.previewOutput, render))
  }

  async function save(path: string | undefined): Promise<void> {
    const target = path ?? options.savePath
    if (!target && session.graph) {
      throw new Error('This document has no .fig path yet; pass one, as in save("design.fig")')
    }
    await session.save(target ? requireFigPath(target) : undefined)
    state.unsaved = false
    output.err(ok(target ? `Saved ${target}` : 'Saved document'))
  }

  function leave(how: ShellLeave): boolean {
    if (!state.unsaved || !options.interactive || state.leaveRequested) return true
    state.leaveRequested = true
    const again = how === 'exit()' ? 'run exit()' : `press ${how}`
    output.err(warn(`Unsaved changes. Run save() first, or ${again} again to discard them.`))
    return false
  }

  async function preview(path: string | undefined): Promise<void> {
    const target = path ?? options.previewOutput
    if (!target) {
      throw new Error('Pass a path, as in preview("page.png"), or start with --preview-output')
    }
    output.err(dim(`Preview: ${await writePreview(target, render)}`))
  }

  /** Runs one command; returns `true` when the shell should stop. */
  async function run(command: ShellCommand): Promise<boolean> {
    if (command.kind === 'exit') return leave('exit()')
    if (command.kind === 'empty') return false
    state.leaveRequested = false
    if (command.kind === 'help') output.out(command.topic ? toolHelp(command.topic) : HELP)
    else if (command.kind === 'tools') output.out(formatToolList())
    else if (command.kind === 'save') await save(command.path)
    else if (command.kind === 'preview') await preview(command.path)
    else await call(command.name, command.args)
    return false
  }

  return {
    async line(text) {
      try {
        return await run(parseShellLine(text))
      } catch (error) {
        state.failures++
        output.err(fail(error instanceof Error ? error.message : String(error)))
        return false
      }
    },
    leave,
    finish() {
      if (state.unsaved) output.err(warn('Changes were not saved'))
      return { failures: state.failures, unsaved: state.unsaved }
    }
  }
}

/** Runs shell lines against one open document until `exit()` or the end of input. */
export async function runShell(
  session: ToolSession,
  lines: AsyncIterable<string>,
  output: ShellOutput,
  options: ShellOptions
): Promise<ShellResult> {
  const shell = createShell(session, output, options)
  for await (const text of lines) {
    if (await shell.line(text)) break
  }
  return shell.finish()
}
