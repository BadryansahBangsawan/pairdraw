import { describe, expect, test } from 'bun:test'

import { createPairing, PAIRING_CODE_TTL_MS, SESSION_IDLE_TIMEOUT_MS } from '#mcp/agents/pairing'

function clock() {
  let time = 1_000_000
  return { now: () => time, advance: (ms: number) => (time += ms) }
}

describe('companion pairing', () => {
  test('trades a fresh code for a session token once', () => {
    const pairing = createPairing()
    const code = pairing.issueCode()
    const first = pairing.exchange(code)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(pairing.isSession(first.token)).toBe(true)
    expect(pairing.exchange(code)).toEqual({ ok: false, reason: 'rejected' })
  })

  test('rejects an expired code', () => {
    const time = clock()
    const pairing = createPairing({ now: time.now })
    const code = pairing.issueCode()
    time.advance(PAIRING_CODE_TTL_MS)
    expect(pairing.exchange(code)).toEqual({ ok: false, reason: 'rejected' })
  })

  test('rejects a wrong code and a code replaced by a newer one', () => {
    const pairing = createPairing()
    const old = pairing.issueCode()
    pairing.issueCode()
    expect(pairing.exchange(old).ok).toBe(false)
    expect(pairing.exchange('not-the-code').ok).toBe(false)
  })

  test('refuses every attempt for a while after too many wrong codes', () => {
    const time = clock()
    const pairing = createPairing({ now: time.now })
    const code = pairing.issueCode()
    for (let attempt = 0; attempt < 10; attempt++) pairing.exchange(`wrong-${attempt}`)
    expect(pairing.exchange(code)).toEqual({ ok: false, reason: 'rate-limited' })
    time.advance(60_000)
    expect(pairing.exchange(code).ok).toBe(true)
  })

  test('accepts only tokens it issued', () => {
    const pairing = createPairing()
    expect(pairing.isSession(null)).toBe(false)
    expect(pairing.isSession('')).toBe(false)
    expect(pairing.isSession('a'.repeat(64))).toBe(false)
  })

  test('a new code from the terminal lifts a lockout another program caused', () => {
    const pairing = createPairing()
    pairing.issueCode()
    for (let attempt = 0; attempt < 10; attempt++) pairing.exchange(`wrong-${attempt}`)
    const fresh = pairing.issueCode()
    expect(pairing.exchange(fresh).ok).toBe(true)
  })

  test('signs out a tab that sat idle, and one that asked to', () => {
    const time = clock()
    const pairing = createPairing({ now: time.now })
    const first = pairing.exchange(pairing.issueCode())
    const second = pairing.exchange(pairing.issueCode())
    if (!first.ok || !second.ok) throw new Error('Pairing failed')
    time.advance(SESSION_IDLE_TIMEOUT_MS - 1)
    // Using a token keeps its session alive.
    expect(pairing.isSession(first.token)).toBe(true)
    time.advance(SESSION_IDLE_TIMEOUT_MS - 1)
    expect(pairing.isSession(first.token)).toBe(true)
    expect(pairing.isSession(second.token)).toBe(false)
    expect(pairing.isAgentToken(second.agentToken)).toBe(false)

    expect(pairing.isAgentToken(first.agentToken)).toBe(true)
    pairing.revoke(first.token)
    expect(pairing.isSession(first.token)).toBe(false)
    expect(pairing.isAgentToken(first.agentToken)).toBe(false)
  })

  test('keeps the agent token apart from the session token', () => {
    const pairing = createPairing()
    const result = pairing.exchange(pairing.issueCode())
    if (!result.ok) throw new Error('Pairing failed')
    expect(pairing.isSession(result.agentToken)).toBe(false)
    expect(pairing.isAgentToken(result.token)).toBe(false)
  })
})
