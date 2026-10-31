import { afterEach, expect, jest, test } from 'bun:test'

import type { UIMessage } from 'ai'
import { nextTick, reactive } from 'vue'

import { createHistorySession } from '@/app/ai/chat/history/session'
import type { HistoryChat } from '@/app/ai/chat/history/types'

afterEach(() => {
  jest.useRealTimers()
})

function message(id: string, text: string): UIMessage {
  return { id, role: 'assistant', parts: [{ type: 'text', text }] }
}

function attached() {
  const chat = reactive<{ -readonly [Key in keyof HistoryChat]: HistoryChat[Key] }>({
    messages: [],
    status: 'ready',
    stop: async () => undefined
  })
  const session = createHistorySession(async () => undefined)
  let saves = 0
  session.attach(chat, async () => {
    saves++
  })
  return { chat, saves: () => saves }
}

/** Lets watchers see a change, then lets `ms` pass. */
async function wait(ms: number) {
  await nextTick()
  jest.advanceTimersByTime(ms)
  await nextTick()
}

test('a reply in progress is saved at most every few seconds, then once as it ends', async () => {
  jest.useFakeTimers()
  const { chat, saves } = attached()
  chat.status = 'streaming'
  await wait(0)
  const started = saves()

  for (let index = 0; index < 20; index++) {
    chat.messages = [message('reply', `Part ${index}`)]
    await wait(200)
  }
  // Four seconds of streaming, inside one save interval.
  expect(saves() - started).toBeLessThanOrEqual(1)

  chat.status = 'ready'
  await wait(0)
  expect(saves()).toBeGreaterThan(started)
  const ended = saves()

  // Once the reply ended, changes are saved promptly again.
  chat.messages = [...chat.messages, message('later', 'Done')]
  await wait(1000)
  expect(saves()).toBeGreaterThan(ended)
})
