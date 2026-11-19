import { bold, cyan, dim, green, ok, printError, red, printJSON, writeStdout } from '#cli/format'

export interface DiffResult {
  diff?: string | null
  message?: string
  error?: string
}

function colorLine(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---')) return bold(line)
  if (line.startsWith('@@')) return cyan(line)
  if (line.startsWith('+')) return green(line)
  if (line.startsWith('-')) return red(line)
  return dim(line)
}

/** Print a unified diff, colored on a terminal and raw when piped so it stays a valid patch. */
export async function printUnifiedDiff(diff: string): Promise<void> {
  const text = process.stdout.isTTY ? diff.split('\n').map(colorLine).join('\n') : diff
  await writeStdout(`${text}\n`)
}

export async function printDiffResult(result: DiffResult, json: boolean): Promise<void> {
  if (result.error) {
    printError(result.error)
    process.exit(1)
  }
  if (json) {
    await printJSON(result)
    return
  }
  if (result.diff) await printUnifiedDiff(result.diff)
  else console.log(ok(result.message ?? 'No differences found'))
}
