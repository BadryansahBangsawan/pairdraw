import { expect, test } from 'bun:test'

import { classifyAIChatError } from '@/app/ai/chat/failure'
import { AgentStartupTimeoutError, raceStartup } from '@/app/ai/transports/deadline'

const neverStops = new Promise<never>(() => {
  // Never settles: a request the agent never answers.
})

test('resolves a startup request that answers', async () => {
  await expect(raceStartup(Promise.resolve('ready'), neverStops, 1_000)).resolves.toBe('ready')
})

test('ends the wait for an agent that never answers', async () => {
  const error = await raceStartup(
    new Promise<never>(() => {
      // Never settles: a request the agent never answers.
    }),
    neverStops,
    20
  ).catch((failure: unknown) => failure)
  expect(error).toBeInstanceOf(AgentStartupTimeoutError)
  expect(classifyAIChatError(error).reason).toBe('agent-timeout')
})

test('reports the agent stopping before it answers', async () => {
  const stoppedReason = new Error('The agent stopped.')
  const stopped = Promise.reject(stoppedReason)
  stopped.catch(() => undefined)
  const error = await raceStartup(
    new Promise<never>(() => {
      // Never settles: a request the agent never answers.
    }),
    stopped,
    1_000
  ).catch((failure: unknown) => failure)
  expect(error).toBe(stoppedReason)
})
