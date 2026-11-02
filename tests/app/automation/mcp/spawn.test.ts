import { describe, expect, test } from 'bun:test'

import { createCompanionConnection } from '@/app/automation/companion/connection'
import { pairedCompanionServer } from '@/app/automation/mcp/spawn'

const TOKEN = 'f'.repeat(64)
const AGENT_TOKEN = 'a'.repeat(64)

/** A companion that pairs any code and answers its status check. */
function companionFetch(url: string): Promise<Response> {
  return Promise.resolve(
    url.endsWith('/pair')
      ? Response.json({ token: TOKEN, agentToken: AGENT_TOKEN, version: '0.16.0' })
      : Response.json({ version: '0.16.0', workspace: '/tmp/agents' })
  )
}

describe('pairedCompanionServer', () => {
  test('uses the server of a companion paired through a link as it is', async () => {
    const connection = createCompanionConnection({ fetch: companionFetch })
    expect(await connection.pair({ code: '0'.repeat(32), port: 7601 })).toBe(true)

    expect(pairedCompanionServer(connection)).toMatchObject({ authToken: TOKEN, managed: false })
    connection.disconnect()
  })

  test('leaves the session of `bun run dev` to the development server setup', async () => {
    // The development MCP server then still takes the root, tools, scope, and auth settings.
    const connection = createCompanionConnection({ fetch: companionFetch })
    await connection.adopt({ token: TOKEN, agentToken: AGENT_TOKEN, port: 7600 })
    expect(connection.connected()).toBe(true)

    expect(pairedCompanionServer(connection)).toBeNull()
    connection.disconnect()
  })

  test('has no server without a companion', () => {
    expect(pairedCompanionServer(createCompanionConnection({ fetch: companionFetch }))).toBeNull()
  })
})
