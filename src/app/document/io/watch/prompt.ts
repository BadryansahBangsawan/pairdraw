import { computed, shallowRef } from 'vue'

export type DiskChangeChoice = 'reload' | 'ignore'

export type DiskChangeRequest = {
  choice: Promise<DiskChangeChoice>
  /** Drops the question unanswered, such as when the document closes or saves elsewhere. */
  withdraw: () => void
}

type QueuedQuestion = {
  id: number
  documentName: string
  answer: (choice: DiskChangeChoice) => void
}

const queue = shallowRef<QueuedQuestion[]>([])
let nextId = 0

/** The question the dialog shows: the oldest document still waiting for an answer. */
export const diskChangePrompt = computed(() => {
  const current = queue.value.at(0)
  return current ? { id: current.id, documentName: current.documentName } : null
})

function settle(id: number, choice: DiskChangeChoice): void {
  const question = queue.value.find((candidate) => candidate.id === id)
  if (!question) return
  queue.value = queue.value.filter((candidate) => candidate.id !== id)
  question.answer(choice)
}

/** Answers the question the dialog shows. */
export function answerDiskChangePrompt(choice: DiskChangeChoice): void {
  const current = queue.value.at(0)
  if (current) settle(current.id, choice)
}

/**
 * Asks whether to reload a document whose file changed on disk while it has unsaved edits. Tabs
 * ask one at a time; withdrawing a question answers it with `ignore`, which keeps the edits.
 */
export function requestDiskChangeChoice(documentName: string): DiskChangeRequest {
  const id = ++nextId
  const choice = new Promise<DiskChangeChoice>((answer) => {
    queue.value = [...queue.value, { id, documentName, answer }]
  })
  return { choice, withdraw: () => settle(id, 'ignore') }
}
