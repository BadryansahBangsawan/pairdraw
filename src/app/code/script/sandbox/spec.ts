/**
 * The layers a script draws, as plain data the worker returns and the host materializes. A script
 * cannot make components, instances, or variables: those need a library, and a script's output is
 * a drawing.
 */
export const SCRIPT_NODE_TYPES = [
  'FRAME',
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'ELLIPSE',
  'TEXT',
  'LINE'
] as const

export type ScriptNodeType = (typeof SCRIPT_NODE_TYPES)[number]

export interface ScriptNodeSpec {
  type: ScriptNodeType
  name?: string
  x?: number
  y?: number
  width?: number
  height?: number
  /** Any CSS colour the renderer takes, such as `#f00`, `#ff0000aa`, `rgb()` or a name; stored as hex. */
  fill?: string
  stroke?: string
  strokeWeight?: number
  opacity?: number
  radius?: number
  text?: string
  fontSize?: number
  fontWeight?: number
  align?: 'LEFT' | 'CENTER' | 'RIGHT'
  layout?: 'HORIZONTAL' | 'VERTICAL'
  gap?: number
  padding?: number
  children?: ScriptNodeSpec[]
}

/** The layers the roots hold, counted the way the budget counts them. */
export function countScriptNodes(roots: readonly ScriptNodeSpec[]): number {
  let count = 0
  const visit = (node: ScriptNodeSpec) => {
    count += 1
    for (const child of node.children ?? []) visit(child)
  }
  for (const root of roots) visit(root)
  return count
}
