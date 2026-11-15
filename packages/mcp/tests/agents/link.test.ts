import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { connectCORSOrigins, resolveConnectAppURL, writeConnectPage } from '#mcp/agents/link'
import { augmentPath, which } from '#mcp/agents/path'
import { DESKTOP_APP_ORIGINS } from '#mcp/transport/origins'

const isWindows = process.platform === 'win32'

describe('companion origins', () => {
  test('drop `*`, which would let any site drive the agent bridge', () => {
    const app = new URL('https://app.example.com/')
    expect(connectCORSOrigins('*, http://localhost:1420', app)).toEqual([
      'http://localhost:1420',
      'https://app.example.com'
    ])
    expect(connectCORSOrigins('*', app)).toEqual(['https://app.example.com'])
  })
})

describe('the app a companion pairs with', () => {
  test('is the editor on this computer unless the operator names another', () => {
    expect(resolveConnectAppURL(undefined)?.href).toBe('http://localhost:1420/')
    expect(resolveConnectAppURL(' ')?.href).toBe('http://localhost:1420/')
    // Only the desktop app and that editor may call the companion.
    expect(connectCORSOrigins(undefined, new URL('http://localhost:1420/'))).toEqual([
      ...DESKTOP_APP_ORIGINS,
      'http://localhost:1420'
    ])
    expect(resolveConnectAppURL('https://cloud.example.com')?.origin).toBe(
      'https://cloud.example.com'
    )
  })

  test('refuses plain HTTP anywhere but this computer', () => {
    expect(resolveConnectAppURL('http://cloud.example.com')).toBeNull()
    expect(resolveConnectAppURL('https://user:secret@cloud.example.com')).toBeNull()
  })
})

describe('the page that opens a link', () => {
  test.skipIf(isWindows)('is readable only by this user and forwards to the link', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pairdraw-connect-page-'))
    try {
      const link = 'https://app.example.com/#connect=abc&port=7601'
      const page = await writeConnectPage(dir, link)
      expect(statSync(page.path).mode & 0o777).toBe(0o600)
      const html = readFileSync(page.path, 'utf8')
      expect(html).toContain('url=https://app.example.com/#connect=abc&amp;port=7601')
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
