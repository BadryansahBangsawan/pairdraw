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

export interface BrowserPageListen {
  (handler: (payload: unknown) => void): (() => void) | Promise<() => void>
}

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
  const armed = createDeferred<void>()
  const done = createDeferred<string>()
  void armed.promise.catch(() => undefined)
  void done.promise.catch(() => undefined)

  let finished = false
  let accepting = false
  let unsubscribe = () => {}
  let clearTimer = () => {}

  function stop() {
    unsubscribe()
    clearTimer()
    unsubscribe = () => {}
    clearTimer = () => {}
  }

  function finish(settle: () => void) {
    if (finished) return
    finished = true
    stop()
    settle()
  }

  function onPayload(payload: unknown) {
    if (!accepting) return
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
        if (finished) {
          stop()
          return
        }
        armed.resolve()
      },
      (error: unknown) => {
        armed.reject(error)
        finish(() => {
          done.reject(error)
        })
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
      if (finished || accepting) return
      accepting = true
      const schedule = input.schedule ?? defaultSchedule
      const clear = schedule(() => {
        finish(() => {
          done.reject(new Error(BROWSER_NODE_LOAD_TIMEOUT))
        })
      }, input.deadlineMs)
      if (finished) {
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
