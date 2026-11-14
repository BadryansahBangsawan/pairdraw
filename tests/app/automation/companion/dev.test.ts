import { describe, expect, mock, test } from 'bun:test'

import type { CompanionSession, CompanionState } from '@/app/automation/companion/connection'
import { adoptDevCompanion } from '@/app/automation/companion/dev'

const SESSION = { token: 'd'.repeat(64), agentToken: 'e'.repeat(64) }

/** A connection whose server answers each check in turn as `answers` says. */
function fakeConnection(answers: boolean[] = [true]) {
  const state: CompanionState = {
    status: 'idle',
    failure: null,
    version: null,
    pending: null,
    dev: false
  }
  function answer() {
    state.status = answers.shift() ? 'connected' : 'lost'
  }
  const adopt = mock(async (_session: CompanionSession) => {
    state.dev = true
    answer()
  })
  const check = mock(async () => answer())
  return { adopt, check, state, connected: () => state.status === 'connected' }
}

describe('adoptDevCompanion', () => {
  test('connects to the development MCP server with the session it was given', async () => {
    const connection = fakeConnection()
    const adopted = await adoptDevCompanion({
      connection,
      session: SESSION,
      serverURL: 'http://127.0.0.1:7612'
    })

    expect(adopted).toBe(true)
    expect(connection.adopt).toHaveBeenCalledWith({ ...SESSION, port: 7612 })
    expect(connection.check).not.toHaveBeenCalled()
  })

  test('checks once more soon when the server did not answer yet', async () => {
    const connection = fakeConnection([false, true])
    const adopted = await adoptDevCompanion({
      connection,
      session: SESSION,
      serverURL: 'http://127.0.0.1:7600',
      retryDelayMs: 0
    })

    expect(adopted).toBe(true)
    expect(connection.check).toHaveBeenCalledTimes(1)
  })

  test('leaves later checks to the connection when the retry fails too', async () => {
    const connection = fakeConnection([false, false])
    const adopted = await adoptDevCompanion({
      connection,
      session: SESSION,
      serverURL: 'http://127.0.0.1:7600',
      retryDelayMs: 0
    })

    expect(adopted).toBe(false)
    expect(connection.check).toHaveBeenCalledTimes(1)
    expect(connection.state).toMatchObject({ status: 'lost', dev: true })
  })

  test('does not check again once the person paired a companion meanwhile', async () => {
    const connection = fakeConnection([false])
    const adopting = adoptDevCompanion({
      connection,
      session: SESSION,
      serverURL: 'http://127.0.0.1:7600',
      retryDelayMs: 50
    })
    await Bun.sleep(0)
    connection.state.dev = false

    expect(await adopting).toBe(false)
    expect(connection.check).not.toHaveBeenCalled()
  })

  test('does nothing without a session, as in builds and with PAIRDRAW_DEV_AGENTS=0', async () => {
    const connection = fakeConnection()
    expect(
      await adoptDevCompanion({ connection, session: null, serverURL: 'http://127.0.0.1:7600' })
    ).toBe(false)
    expect(connection.adopt).not.toHaveBeenCalled()
  })

  test.each([
    ['a Portless address', 'https://mcp.pairdraw.localhost'],
    ['another host', 'http://192.168.1.2:7600'],
    ['no address', ''],
    ['a port out of range', 'http://127.0.0.1:70000']
  ])('never sends the session to %s', async (_label, serverURL) => {
    const connection = fakeConnection()
    expect(await adoptDevCompanion({ connection, session: SESSION, serverURL })).toBe(false)
    expect(connection.adopt).not.toHaveBeenCalled()
  })

  test('does nothing outside the development server', async () => {
    const connection = fakeConnection()
    expect(await adoptDevCompanion({ connection })).toBe(false)
    expect(connection.adopt).not.toHaveBeenCalled()
  })
})
