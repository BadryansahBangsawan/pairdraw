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

export interface SandboxRun<T> {
  /** What the frame is given once it reports ready. */
  request: unknown
  /** Whether one message is the frame's ready message. */
  ready(data: unknown): boolean
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
    if (run.ready(data)) {
      clearTimeout(timer)
      timer = setTimeout(() => finish(run.timeoutResult), run.timeoutMs)
      frame.postMessage(run.request, '*')
      return
    }
    const result = run.read(data)
    if (result !== null) finish(result)
  })
  timer = setTimeout(() => finish(run.readyTimeoutResult), run.readyTimeoutMs)
  return promise
}