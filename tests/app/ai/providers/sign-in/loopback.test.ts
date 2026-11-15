import { afterEach, describe, expect, test } from 'bun:test'

import { loopbackRedirect } from '@/app/ai/providers/sign-in/loopback'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

afterEach(async () => {
  await clearTauriMocks()
})

describe('loopback sign-in redirect', () => {
  test("takes the provider's port, names the provider on the pages, and waits and frees it", async () => {
    const calls: { cmd: string; args: unknown }[] = []
    await mockTauriIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'openrouter_oauth_listen') return 51_423
      if (cmd === 'openrouter_oauth_wait') return { kind: 'code', code: 'abc' }
      return null
    })

    const redirect = await loopbackRedirect('openrouter', 'OpenRouter', 'state-1')
    if (redirect === 'port-in-use') throw new Error('expected a port')
    expect(redirect.port).toBe(51_423)
    expect(calls[0]).toEqual({
      cmd: 'openrouter_oauth_listen',
      args: {
        state: 'state-1',
        pages: {
          signedIn: 'Signed in to OpenRouter. You can close this tab and return to Pairdraw.',
          cancelled: 'OpenRouter sign-in was cancelled. You can close this tab.',
          stale: 'This sign-in link belongs to an earlier attempt. Start again from Pairdraw.'
        }
      }
    })

    await expect(redirect.callback.wait()).resolves.toEqual({ kind: 'code', code: 'abc' })
    redirect.callback.close()
    expect(calls.map(({ cmd }) => cmd)).toEqual([
      'openrouter_oauth_listen',
      'openrouter_oauth_wait',
      'openrouter_oauth_cancel'
    ])
    expect(calls[2]?.args).toEqual({ state: 'state-1' })
  })

  test('reports a port another program holds', async () => {
    await mockTauriIPC((cmd) => {
      if (cmd === 'chatgpt_oauth_listen') throw 'port-in-use'
      return null
    })

    await expect(loopbackRedirect('chatgpt', 'ChatGPT', 'state-1')).resolves.toBe('port-in-use')
  })
})
