import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { Window as HappyWindow } from 'happy-dom'

import { toast } from '@/app/shell/ui'

import { asDouble } from '#tests/helpers/doubles'

const REPEATED = "TypeError: undefined is not an object (evaluating 'a.offset.x')"

const hadWindow = Object.hasOwn(globalThis, 'window')
const previousWindow = globalThis.window
const dom = new HappyWindow()
globalThis.window = asDouble<Window & typeof globalThis>(dom)

function dispatch(event: object): void {
  window.dispatchEvent(asDouble<Event>(event))
}

function clearToasts() {
  for (const entry of toast.toasts.value) toast.remove(entry.id)
}

beforeAll(() => {
  toast.setupGlobalErrorHandler()
})
beforeEach(clearToasts)
afterEach(clearToasts)
afterAll(() => {
  dom.happyDOM.abort()
  if (hadWindow) globalThis.window = previousWindow
  else Reflect.deleteProperty(globalThis, 'window')
})

describe('window errors', () => {
  test('a repeating window error stays one toast', () => {
    dispatch(new dom.ErrorEvent('error', { message: REPEATED }))
    dispatch(new dom.ErrorEvent('error', { message: REPEATED }))
    const shown = toast.toasts.value.filter((entry) => entry.variant === 'error')
    expect(shown).toHaveLength(1)
    expect(shown[0]?.count).toBe(1)
  })

  test('a repeating unhandled rejection stays one toast', () => {
    const reason = new TypeError(REPEATED)
    const reject = () => {
      const event = new dom.Event('unhandledrejection')
      Reflect.set(event, 'reason', reason)
      dispatch(event)
    }
    reject()
    reject()
    const shown = toast.toasts.value.filter((entry) => entry.variant === 'error')
    expect(shown).toHaveLength(1)
    expect(shown[0]?.count).toBe(1)
  })

  test('a deliberate toast still counts after the same message was uncaught', () => {
    dispatch(new dom.ErrorEvent('error', { message: REPEATED }))
    dispatch(new dom.ErrorEvent('error', { message: REPEATED }))
    toast.error(REPEATED)
    const shown = toast.toasts.value.filter((entry) => entry.variant === 'error')
    expect(shown).toHaveLength(1)
    expect(shown[0]?.count).toBe(2)
  })
})
