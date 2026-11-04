import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import { toUint8Array } from 'js-base64'

import { writeFileAtomic } from '@open-pencil/core/node/fs'
import type { ToolDef } from '@open-pencil/core/tools'

import { safeOutputPath } from '#cli/agent/paths'

function recordValue(result: unknown, key: string): unknown {
  if (!result || typeof result !== 'object') return undefined
  for (const [name, value] of Object.entries(result)) {
    if (name === key) return value
  }
  return undefined
}

function fileOutput(toolName: string, result: unknown): string | Uint8Array | null {
  const svg = recordValue(result, 'svg')
  if (toolName === 'export_svg') return typeof svg === 'string' ? svg : null
  const jsx = recordValue(result, 'jsx')
  if (toolName === 'get_jsx') return typeof jsx === 'string' ? jsx : null
  const base64 = recordValue(result, 'base64')
  if (toolName === 'export_image' || toolName === 'export_pdf') {
    return typeof base64 === 'string' ? toUint8Array(base64) : null
  }
  return null
}

function argumentPath(tool: ToolDef, args: Record<string, unknown>): string | undefined {
  if (!('path' in args) || typeof args.path !== 'string') return undefined
  if (!['export_svg', 'get_jsx', 'export_image', 'export_pdf'].includes(tool.name)) return undefined
  return args.path
}

/** Run a headless tool and write a file output where it names, staying inside `root`. */
export async function executeAgentTool(
  tool: ToolDef,
  args: Record<string, unknown>,
  root: string,
  execute: () => Promise<unknown>
): Promise<unknown> {
  const path = argumentPath(tool, args)
  const output = path ? await safeOutputPath(path, root) : undefined
  const result = await execute()
  if (!output) return result
  const content = fileOutput(tool.name, result)
  if (content === null) return result
  await mkdir(dirname(output), { recursive: true })
  await writeFileAtomic(output, content, { symlink: 'replace' })
  // Tell the model where the file landed; spreading a non-record result is not safe.
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const record = Object.fromEntries(Object.entries(result))
    return { ...record, path: output }
  }
  return result
}
