import {
  ok,
  fail,
  warn,
  dim,
  bold,
  cyan,
  green,
  red,
  entity,
  kv,
  tree as fmtTree,
  list as fmtList,
  node as fmtNode,
  histogram as fmtHistogram,
  summary as fmtSummary
} from 'agentfmt'

export {
  ok,
  fail,
  warn,
  dim,
  bold,
  cyan,
  green,
  red,
  entity,
  kv,
  fmtTree,
  fmtList,
  fmtNode,
  fmtHistogram,
  fmtSummary
}

export function printNodeResults(
  results: Array<{ type: string; name: string; id: string }>,
  formatLabel: (n: { type: string; name: string; id: string }) => string = (n) => n.name
): void {
  if (results.length === 0) {
    console.log('No nodes found.')
    return
  }
  console.log('')
  console.log(bold(`  Found ${results.length} node${results.length > 1 ? 's' : ''}`))
  console.log('')
  console.log(
    fmtList(
      results.map((n) => ({
        header: entity(formatType(n.type), formatLabel(n), n.id)
      }))
    )
  )
  console.log('')
}

const TYPE_LABELS: Record<string, string> = {
  FRAME: 'frame',
  RECTANGLE: 'rect',
  ROUNDED_RECTANGLE: 'rounded-rect',
  ELLIPSE: 'ellipse',
  TEXT: 'text',
  COMPONENT: 'component',
  COMPONENT_SET: 'component-set',
  INSTANCE: 'instance',
  GROUP: 'group',
  VECTOR: 'vector',
  LINE: 'line',
  POLYGON: 'polygon',
  STAR: 'star',
  BOOLEAN_OPERATION: 'boolean',
  SECTION: 'section',
  CANVAS: 'page'
}

export function formatType(type: string): string {
  return TYPE_LABELS[type] ?? type.toLowerCase()
}

/**
 * Writes `text` to standard output and resolves once it is handed to the system. Under Bun,
 * `console.log` drops what a pipe does not take at once (64 KB) after anything touches
 * `process.stdout`, so large output goes through the stream instead.
 */
export function writeStdout(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(text, (error) => (error ? reject(error) : resolve()))
  })
}

export function printError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(fail(message))
}
