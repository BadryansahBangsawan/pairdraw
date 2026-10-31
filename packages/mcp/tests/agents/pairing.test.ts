import { describe, expect, test } from 'bun:test'

import { createPairing, PAIRING_CODE_TTL_MS } from '#mcp/agents/pairing'

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
})
