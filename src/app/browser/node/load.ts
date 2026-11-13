import * as v from 'valibot'

import { createDeferred } from '@/app/runtime/deferred'

import type { BrowserNodeLoadWait } from './session'

/** How long a snapshot refresh waits for the window to finish loading the page. */
export const BROWSER_SNAPSHOT_LOAD_MS = 10_000

/** Shown when that wait ends with no finished page. */
export const BROWSER_NODE_LOAD_TIMEOUT = 'The page did not finish loading.'

const pageReportSchema = v.object({
  url: v.string(),
  title: v.string()
})

export type BrowserPageListen = (
  handler: (payload: unknown) => void
) => (() => void) | Promise<() => void>

/**
 * Waits for the next finished page. Reports are ignored until `begin`, so subscribing before the
 * navigation does not treat the previous page as the one that just loaded. `cancel` and the
 * deadline both drop the listener.
 */
export function waitForBrowserPage(input: {
  listen: BrowserPageListen
  deadlineMs: number
  schedule?: (onTime: () => void, ms: number) => () => void
}): BrowserNodeLoadWait {
  const armed = createDeferred<undefined>()
  const done = createDeferred<string>()
  void armed.promise.catch(() => undefined)
  void done.promise.catch(() => undefined)

  const gate = { finished: false, accepting: false }
  let unsubscribe: () => void = () => undefined
  let clearTimer: () => void = () => undefined

  function stop() {
    unsubscribe()
    clearTimer()
    unsubscribe = () => undefined
    clearTimer = () => undefined
  }

  function finish(settle: () => void) {
    if (gate.finished) return
    gate.finished = true
    stop()
    settle()
  }

  function onPayload(payload: unknown) {
    if (!gate.accepting) return
    const parsed = v.safeParse(pageReportSchema, payload)
    if (!parsed.success) return
    const url = parsed.output.url.trim()
    if (url === '') return
    finish(() => {
      done.resolve(url)
    })
  }

  try {
    void Promise.resolve(input.listen(onPayload)).then(
      (stopListen) => {
        unsubscribe = stopListen
        if (gate.finished) {
          stop()
          return undefined
        }
        armed.resolve(undefined)
        return undefined
      },
      (error: unknown) => {
        armed.reject(error)
        finish(() => {
          done.reject(error)
        })
        return undefined
      }
    )
  } catch (error) {
    armed.reject(error)
    finish(() => {
      done.reject(error)
    })
  }

  return {
    armed: armed.promise,
    begin() {
      if (gate.finished || gate.accepting) return
      gate.accepting = true
      const schedule = input.schedule ?? defaultSchedule
      const clear = schedule(() => {
        finish(() => {
          done.reject(new Error(BROWSER_NODE_LOAD_TIMEOUT))
        })
      }, input.deadlineMs)
      // A schedule can run its callback before it returns, which sets the flag. The checker
      // does not see that write.
      // eslint-disable-next-line typescript/no-unnecessary-condition -- sync schedule sets the flag
      if (gate.finished) {
        clear()
        return
      }
      clearTimer = clear
    },
    done: done.promise,
    cancel() {
      finish(() => {
        done.reject(new Error(BROWSER_NODE_LOAD_TIMEOUT))
        armed.reject(new Error(BROWSER_NODE_LOAD_TIMEOUT))
      })
    }
  }
}

function defaultSchedule(onTime: () => void, ms: number): () => void {
  const handle = setTimeout(onTime, ms)
  return () => {
    clearTimeout(handle)
  }
}
