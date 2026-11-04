import { describe, expect, test } from 'bun:test'
import { mkdtemp, symlink } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { ALL_TOOLS } from '@open-pencil/core/tools'
import { resolveAgentRoot, safeOutputPath } from '#cli/agent/paths'
import { agentToolDefinitions, parseToolNames } from '#cli/agent/policy'

describe('headless agent paths', () => {
  test('roots at the working directory on Unix and at home on Windows', () => {
    expect(resolveAgentRoot(undefined, '/project', 'darwin')).toBe('/project')
    expect(resolveAgentRoot(undefined, '/project', 'linux')).toBe('/project')
    expect(resolveAgentRoot(undefined, '/project', 'win32')).toBe(homedir())
    expect(resolveAgentRoot(' docs ', '/project', 'darwin')).toBe('docs')
  })
  test('keeps writes inside root through dot paths and symlinks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'open-pencil-agent-root-'))
    const outside = await mkdtemp(join(tmpdir(), 'open-pencil-agent-outside-'))
    await symlink(outside, join(root, 'linked'))
    expect(await safeOutputPath('result.fig', root)).toBe(resolve(root, 'result.fig'))
    await expect(safeOutputPath('../outside.fig', root)).rejects.toThrow('outside the allowed root')
    await expect(safeOutputPath(join(root, 'linked', 'outside.fig'), root)).rejects.toThrow('outside the allowed root')
  })
})

describe('headless agent tool policy', () => {
  const defaults = { catalog: ALL_TOOLS }
  test('offers document tools but not eval or network tools by default', () => {
    const names = agentToolDefinitions(defaults).map((tool) => tool.name)
    expect(names).toContain('get_selection')
    expect(names).toContain('create_page')
    expect(names).not.toContain('eval')
    expect(names).not.toContain('stock_photo')
    for (const tool of ALL_TOOLS) {
      if (tool.capabilities.includes('network:access')) expect(names).not.toContain(tool.name)
    }
  })
  test('allows named network tools but never eval', () => {
    expect(agentToolDefinitions({ ...defaults, allow: ['generate_image'] }).map((t) => t.name)).toContain('generate_image')
    expect(agentToolDefinitions({ ...defaults, allow: ['eval'] }).map((t) => t.name)).not.toContain('eval')
  })
  test('supports deny and rejects unknown names', () => {
    const denied = agentToolDefinitions({ ...defaults, deny: ['render'] }).map((tool) => tool.name)
    expect(denied).not.toContain('render')
    expect(denied).toContain('get_selection')
    expect(() => agentToolDefinitions({ ...defaults, allow: ['set_fils'] })).toThrow('Unknown tool "set_fils"')
  })
  test('parses comma-separated names', () => {
    expect(parseToolNames(' render, set_fill ,')).toEqual(['render', 'set_fill'])
    expect(parseToolNames(undefined)).toEqual([])
  })
})
