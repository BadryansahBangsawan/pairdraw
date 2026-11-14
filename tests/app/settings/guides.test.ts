import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

import { SYSTEM_REQUIREMENTS_URL } from '@/app/shell/support/guidance'
import {
  CLOUD_DOCS_URL,
  CODING_AGENTS_GUIDE_URL,
  MCP_CLIENT_SETUP_DOCS_URL,
  MCP_CONNECTIONS_DOCS_URL,
  MCP_SERVER_DOCS_URL,
  PI_GUIDE_URL,
  WEBMCP_DOCS_URL,
  docsURL
} from '@/constants'

import { repoPath } from '#tests/helpers/paths'

const DOCS_ON_GITHUB = 'https://github.com/BadryansahBangsawan/pairdraw/blob/master/packages/docs/'

/** The anchor GitHub gives a Markdown heading: its text, lowercased, punctuation dropped. */
function githubAnchor(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
}

function headingAnchors(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line) => {
      const heading = /^#{1,6}\s+(.*)$/.exec(line)?.[1]
      return heading ? [githubAnchor(heading)] : []
    })
}

describe('guide links', () => {
  test('read a guide from the repository on GitHub', () => {
    expect(docsURL('programmable/ai-chat')).toBe(`${DOCS_ON_GITHUB}programmable/ai-chat.md`)
    expect(docsURL('programmable/ai-chat', 'external-mcp-connections')).toBe(
      `${DOCS_ON_GITHUB}programmable/ai-chat.md#external-mcp-connections`
    )
  })

  test.each([
    CLOUD_DOCS_URL,
    CODING_AGENTS_GUIDE_URL,
    MCP_CLIENT_SETUP_DOCS_URL,
    MCP_CONNECTIONS_DOCS_URL,
    MCP_SERVER_DOCS_URL,
    PI_GUIDE_URL,
    WEBMCP_DOCS_URL,
    SYSTEM_REQUIREMENTS_URL
  ])('%s names a guide and a heading in it', (url) => {
    expect(url.startsWith(DOCS_ON_GITHUB)).toBe(true)
    const [path = '', anchor] = url.slice(DOCS_ON_GITHUB.length).split('#')
    const file = repoPath('packages/docs', path)
    expect(existsSync(file)).toBe(true)
    if (anchor) expect(headingAnchors(file)).toContain(anchor)
  })
})
