import { describe, expect, test } from 'bun:test'

import { BROWSER_NODE_LOAD_TIMEOUT, waitForBrowserPage } from '@/app/browser/node/load'

const PAGE = { url: 'https://example.com/docs', title: 'Docs' }

describe('waiting for a snapshot page to load', () => {
  test('a report before the navigation starts is not the loaded page', async () => {
    let handler: (payload: unknown) => void = () => undefined
    let unsubscribed = false
    const wait = waitForBrowserPage({
      listen(onPayload) {
        handler = onPayload
        return () => {
          unsubscribed = true
        }
      },
      deadlineMs: 10_000,
      schedule: () => () => undefined
    })
    handler({ url: 'https://old.example/', title: 'Old' })
    await wait.armed
    wait.begin()
    handler({ url: '  https://new.example/docs  ', title: 'New' })
    expect(await wait.done).toBe('https://new.example/docs')
    expect(unsubscribed).toBe(true)
  })

  test('an empty or unreadable report keeps waiting', async () => {
    let handler: (payload: unknown) => void = () => undefined
    const wait = waitForBrowserPage({
      listen(onPayload) {
        handler = onPayload
        return () => undefined
      },
      deadlineMs: 10_000,
      schedule: () => () => undefined
    })
    await wait.armed
    wait.begin()
    handler({ url: '   ', title: 'Blank' })
    handler({ url: 'https://example.com/' })
    handler(null)
    let settled = false
    void wait.done.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    handler(PAGE)
    expect(await wait.done).toBe(PAGE.url)
  })

  test('the deadline rejects and drops the listener', async () => {
    let unsubscribed = false
    let cleared = false
    const wait = waitForBrowserPage({
      listen: () => () => {
        unsubscribed = true
      },
      deadlineMs: 10_000,
      schedule(onTime) {
        onTime()
        return () => {
          cleared = true
        }
      }
    })
    await wait.armed
    wait.begin()
    const error = await wait.done.then(
      () => null,
      (reason: unknown) => reason
    )
    expect(error).toBeInstanceOf(Error)
    if (error instanceof Error) expect(error.message).toBe(BROWSER_NODE_LOAD_TIMEOUT)
    expect(unsubscribed).toBe(true)
    expect(cleared).toBe(true)
  })

  test('cancel drops the listener and a later report does nothing', async () => {
    let unsubscribed = false
    let handler: (payload: unknown) => void = () => undefined
    let resolveListen: (stop: () => void) => void = () => undefined
    const wait = waitForBrowserPage({
      listen(onPayload) {
        handler = onPayload
        return new Promise((resolve) => {
          resolveListen = resolve
        })
      },
      deadlineMs: 10_000,
      schedule: () => {
        throw new Error('cancelled wait must not start the deadline')
      }
    })
    let settled = 'pending'
    void wait.done.then(
      () => {
        settled = 'resolved'
      },
      () => {
        settled = 'rejected'
      }
    )
    wait.cancel()
    resolveListen(() => {
      unsubscribed = true
    })
    await Promise.resolve()
    await Promise.resolve()
    handler(PAGE)
    await Promise.resolve()
    expect(settled).toBe('rejected')
    expect(unsubscribed).toBe(true)
    const armed = await wait.armed.then(
      () => 'open',
      () => 'rejected'
    )
    expect(armed).toBe('rejected')
  })

  test('a listener that fails to attach rejects the wait', async () => {
    const refused = waitForBrowserPage({
      listen: () => Promise.reject(new Error('listen failed')),
      deadlineMs: 10_000
    })
    const asyncError = await refused.armed.then(
      () => null,
      (reason: unknown) => reason
    )
    expect(asyncError).toBeInstanceOf(Error)
    if (asyncError instanceof Error) expect(asyncError.message).toBe('listen failed')

    const thrown = waitForBrowserPage({
      listen: () => {
        throw new Error('listen threw')
      },
      deadlineMs: 10_000
    })
    const syncError = await thrown.armed.then(
      () => null,
      (reason: unknown) => reason
    )
    expect(syncError).toBeInstanceOf(Error)
    if (syncError instanceof Error) expect(syncError.message).toBe('listen threw')
  })
})
