import { describe, expect, test } from 'bun:test'

import { ref } from 'vue'

import type { AutoConnectOutcome } from '@/app/ai/agents/auto/session'
import { createFirstRunDetection } from '@/app/ai/models/settings/onboarding/dialog'

interface FirstRunOptions {
  skip?: boolean
  untouched?: boolean
  hostAvailable?: boolean
}

/** First-run detection on a fake app, recording lookups and setup marked done. */
function firstRun({ skip = false, untouched = true, hostAvailable = true }: FirstRunOptions = {}) {
  const app = { untouched: ref(untouched), hostAvailable: ref(hostAvailable) }
  const recorded = { detect: 0, done: 0 }
  const detect = createFirstRunDetection({
    skip,
    untouched: () => app.untouched.value,
    hostAvailable: () => app.hostAvailable.value,
    autoConnect: {
      async detect(): Promise<AutoConnectOutcome> {
        recorded.detect++
        return 'connected'
      }
    },
    markSetupDone: () => recorded.done++
  })
  return { detect, app, recorded }
}

describe('looking for coding agents when the app starts', () => {
  test('looks on a fresh install, and opens nothing itself', async () => {
    const { detect, recorded } = firstRun()
    expect(await detect()).toBe('connected')
    expect(recorded).toEqual({ detect: 1, done: 0 })
  })

  test('does not look in runs that bring their own data, such as tests', async () => {
    const { detect, recorded } = firstRun({ skip: true })
    expect(await detect()).toBeNull()
    expect(recorded).toEqual({ detect: 0, done: 0 })
  })

  test('marks setup done without looking when a model is already set up', async () => {
    const { detect, recorded } = firstRun({ untouched: false })
    expect(await detect()).toBeNull()
    expect(recorded).toEqual({ detect: 0, done: 1 })
  })

  test('waits for agents to be able to run, as a web app waits for its companion', async () => {
    const { detect, app, recorded } = firstRun({ hostAvailable: false })
    const outcome = detect()
    await Promise.resolve()
    expect(recorded.detect).toBe(0)

    app.hostAvailable.value = true
    expect(await outcome).toBe('connected')
    expect(recorded.detect).toBe(1)
  })

  test('leaves alone a model set up while it waited for the companion', async () => {
    const { detect, app, recorded } = firstRun({ hostAvailable: false })
    const outcome = detect()

    app.untouched.value = false
    app.hostAvailable.value = true
    expect(await outcome).toBeNull()
    expect(recorded).toEqual({ detect: 0, done: 0 })
  })
})
