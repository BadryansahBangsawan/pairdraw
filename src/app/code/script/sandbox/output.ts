/**
 * The layers a script drew, checked before either side of the sandbox uses them: the worker stops a
 * bad tree before it crosses the channel, and the host refuses one a buggy frame made up. The first
 * problem names the layer and the field, so a script author can find it in their source.
 */
import * as v from 'valibot'

import { scriptNodeSpecSchema } from '@/app/code/script/sandbox/schema'
import { countScriptNodes, type ScriptNodeSpec } from '@/app/code/script/sandbox/spec'
import { SCRIPT_MAX_NODES } from '@/app/code/script/sandbox/types'

export const SCRIPT_INVALID_OUTPUT_ERROR = 'Script output is not a valid layer.'
export const SCRIPT_TOO_MANY_NODES_ERROR = `Script output exceeds ${SCRIPT_MAX_NODES} nodes.`

/** A path into the returned tree: `roots[0].children[1].fill`. */
function placeOf(index: number, issue: v.BaseIssue<unknown>): string {
  let place = `roots[${index}]`
  for (const item of issue.path ?? []) {
    if (!('key' in item)) continue
    const key = item.key
    if (typeof key === 'number') place += `[${key}]`
    else if (typeof key === 'string') place += `.${key}`
  }
  return place
}

/** Check the roots a script returned, or say which layer field is wrong. */
export function checkScriptRoots(value: unknown): ScriptNodeSpec[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${SCRIPT_INVALID_OUTPUT_ERROR} The script must return an array of layers.`)
  }
  const roots: ScriptNodeSpec[] = []
  for (const [index, root] of value.entries()) {
    const parsed = v.safeParse(scriptNodeSpecSchema, root)
    if (!parsed.success) {
      const issue = parsed.issues[0]
      throw new Error(`${SCRIPT_INVALID_OUTPUT_ERROR} ${placeOf(index, issue)}: ${issue.message}`)
    }
    roots.push(parsed.output)
  }
  if (countScriptNodes(roots) > SCRIPT_MAX_NODES) throw new Error(SCRIPT_TOO_MANY_NODES_ERROR)
  return roots
}
