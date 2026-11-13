/**
 * The lifecycle shared by every opaque-origin sandbox run: wait for the frame's ready message,
 * post one request, take the first message that answers it, and tear the frame down on every
 * path, so a run that hangs or floods the channel costs one frame and nothing else.
 */
import { createDeferred } from '@/app/runtime/deferred'

/** One sandbox frame, as the host drives it; the app supplies the iframe, a test a double. */
export interface SandboxFrame {
  /** Posts to the frame; `targetOrigin` lets a frame check where a message came from. */
  postMessage(message: unknown, targetOrigin?: string): void
  /** Calls `handler` with every message the frame sends; returns the unsubscribe function. */
  listen(handler: (data: unknown) => void): () => void
  dispose(): void
}

/** The frame to run in; the app's iframe when missing. */
export type SandboxFrameFactory = () => SandboxFrame

/** Stops the run's deadline while it waits on the user, and starts it again after. */
export interface SandboxDeadline {
  pause(): void
  resume(): void
}

export interface SandboxRun<T> {
  /** What the frame is given once it reports ready. */
  request: unknown
  /** Whether one message is the frame's ready message; the deadline control comes with it. */
  ready(data: unknown, deadline: SandboxDeadline): boolean
  /**
   * Takes a message the run itself answers, such as a host call the frame relays; returning true
   * keeps it from being read as the run's answer. `reply` posts back to the frame.
   */
  handle?(data: unknown, reply: (message: unknown) => void): boolean
  /** The result one message carries, or `null` for a message that does not answer this run. */
  read(data: unknown): T | null
  timeoutMs: number
  readyTimeoutMs: number
  /** The result of a run that outlasted `timeoutMs`. */
  timeoutResult: T
  /** The result of a frame that never reported ready. */
  readyTimeoutResult: T
}

export function runInSandboxFrame<T>(frame: SandboxFrame, run: SandboxRun<T>): Promise<T> {
  const { promise, resolve } = createDeferred<T>()
  let settled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  // The deadline is what stops a run that loops; a run that waits on the user pauses it. Pauses are
  // counted, because one answer must not start the clock while another wait still holds it.
  let remaining = run.timeoutMs
  let armedAt = 0
  let pauses = 0
  function arm(ms: number): void {
    clearTimeout(timer)
    remaining = ms
    armedAt = Date.now()
    timer = setTimeout(() => finish(run.timeoutResult), ms)
  }
  const deadline: SandboxDeadline = {
    pause() {
      if (settled || pauses++ > 0) return
      clearTimeout(timer)
      remaining -= Date.now() - armedAt
    },
    resume() {
      if (settled || pauses === 0) return
      pauses -= 1
      if (pauses === 0) arm(remaining)
    }
  }
  // `finish` is a declaration so the listener below can close over `unlisten` before it exists.
  function finish(result: T) {
    if (settled) return
    settled = true
    clearTimeout(timer)
    unlisten()
    frame.dispose()
    resolve(result)
  }
  const unlisten = frame.listen((data) => {
    if (run.ready(data, deadline)) {
      arm(run.timeoutMs)
      frame.postMessage(run.request, '*')
      return
    }
    if (run.handle?.(data, (message) => frame.postMessage(message, '*'))) return
    const result = run.read(data)
    if (result !== null) finish(result)
  })
  timer = setTimeout(() => finish(run.readyTimeoutResult), run.readyTimeoutMs)
  return promise
}
