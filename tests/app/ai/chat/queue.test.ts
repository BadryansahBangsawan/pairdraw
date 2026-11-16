import { expect, test } from 'bun:test'

import { promptSubmission } from '@/app/ai/chat/pending-prompt'
import {
  clearQueuedMessages,
  enqueueMessage,
  hasSteeringMessage,
  queuedMessages,
  takeBackMessages,
  takeNextMessage
} from '@/app/ai/chat/queue'
import type { EditorStore } from '@/app/editor/active-store'

import { asDouble } from '#tests/helpers/doubles'

function documentStore(): EditorStore {
  return asDouble<EditorStore>({})
}

test("a document's waiting messages stay with it; another document's chat never takes them", () => {
  const first = documentStore()
  const second = documentStore()
  enqueueMessage(first, promptSubmission('Make it blue'), 'steer')

  expect(queuedMessages(second)).toHaveLength(0)
  expect(hasSteeringMessage(second)).toBe(false)
  expect(takeNextMessage(second)).toBeNull()
  expect(takeBackMessages(second)).toHaveLength(0)

  expect(queuedMessages(first)).toHaveLength(1)
  expect(hasSteeringMessage(first)).toBe(true)
  expect(takeNextMessage(first)?.displayText).toBe('Make it blue')
  expect(queuedMessages(first)).toHaveLength(0)
})

test('steering goes before follow-ups, each in the order written', () => {
  const store = documentStore()
  enqueueMessage(store, promptSubmission('Then add a caption'), 'follow-up')
  enqueueMessage(store, promptSubmission('Make it blue'), 'steer')
  enqueueMessage(store, promptSubmission('And a border'), 'follow-up')

  expect(takeNextMessage(store)?.displayText).toBe('Make it blue')
  expect(takeBackMessages(store).map((submission) => submission.displayText)).toEqual([
    'Then add a caption',
    'And a border'
  ])
  expect(takeNextMessage(store)).toBeNull()
})

test("clearing a document's queue leaves another document's", () => {
  const first = documentStore()
  const second = documentStore()
  enqueueMessage(first, promptSubmission('Make it blue'), 'steer')
  enqueueMessage(second, promptSubmission('Make it red'), 'follow-up')

  clearQueuedMessages(first)
  expect(queuedMessages(first)).toHaveLength(0)
  expect(queuedMessages(second).map((item) => item.submission.displayText)).toEqual(['Make it red'])
})
