import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { connectCORSOrigins, writeConnectPage } from '#mcp/agents/link'
import { augmentPath, which } from '#mcp/agents/path'

const isWindows = process.platform === 'win32'

describe('companion origins', () => {
  test('drop `*`, which would let any site drive the agent bridge', () => {
    const app = new URL('https://app.openpencil.dev/')
    expect(connectCORSOrigins('*, http://localhost:1420', app)).toEqual([
      'http://localhost:1420',
      'https://app.openpencil.dev'
    ])
    expect(connectCORSOrigins('*', app)).toEqual(['https://app.openpencil.dev'])
  })
})

describe('the page that opens a link', () => {
  test.skipIf(isWindows)('is readable only by this user and forwards to the link', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'op-connect-page-'))
    try {
      const link = 'https://app.openpencil.dev/#connect=abc&port=7601'
      const page = await writeConnectPage(dir, link)
      expect(statSync(page.path).mode & 0o777).toBe(0o600)
      const html = readFileSync(page.path, 'utf8')
      expect(html).toContain('url=https://app.openpencil.dev/#connect=abc&amp;port=7601')
      await page.remove()
      expect(() => statSync(page.path)).toThrow()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('the PATH agents are found on', () => {
  test('keeps only absolute folders, so a file in the current folder cannot pose as an agent', () => {
    const path = ['.', 'bin', '', '/usr/bin'].join(delimiter)
    expect(augmentPath(path, []).split(delimiter)).toEqual(['/usr/bin'])
    expect(which('sh', ['.', 'bin'].join(delimiter))).toBeNull()
  })
})
