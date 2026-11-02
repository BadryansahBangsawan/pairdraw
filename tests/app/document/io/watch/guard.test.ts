import { afterEach, describe, expect, test } from 'bun:test'

import { createDiskChangeGuard } from '@/app/document/io/watch/guard'
import {
  answerDiskChangePrompt,
  diskChangePrompt,
  requestDiskChangeChoice
} from '@/app/document/io/watch/prompt'

function harness(dirty: boolean) {
  const state = { dirty, reloads: 0 }
  const guard = createDiskChangeGuard({
    hasUnsavedChanges: () => state.dirty,
    getDocumentName: () => 'Landing page',
    reloadFromDisk: () => {
      state.reloads++
    }
  })
  return { state, guard }
}

afterEach(() => {
  while (diskChangePrompt.value) answerDiskChangePrompt('ignore')
})

describe('disk change guard', () => {
  test('reloads a document without unsaved edits at once', async () => {
    const { state, guard } = harness(false)
    await guard.onDiskChange()
    expect(state.reloads).toBe(1)
    expect(diskChangePrompt.value).toBeNull()
  })

  test('asks before reloading a document with unsaved edits, and reloads on Reload', async () => {
    const { state, guard } = harness(true)
    const change = guard.onDiskChange()
    expect(diskChangePrompt.value?.documentName).toBe('Landing page')
    expect(guard.isPending()).toBe(true)
    expect(state.reloads).toBe(0)

    answerDiskChangePrompt('reload')
    await change
    expect(state.reloads).toBe(1)
    expect(guard.isPending()).toBe(false)
    expect(diskChangePrompt.value).toBeNull()
  })

  test('Ignore keeps the edits and a later change asks again', async () => {
    const { state, guard } = harness(true)
    const first = guard.onDiskChange()
    answerDiskChangePrompt('ignore')
    await first
    expect(state.reloads).toBe(0)
    expect(guard.isPending()).toBe(false)

    const second = guard.onDiskChange()
    expect(diskChangePrompt.value).not.toBeNull()
    answerDiskChangePrompt('reload')
    await second
    expect(state.reloads).toBe(1)
  })

  test('changes while the question is open share its answer', async () => {
    const { state, guard } = harness(true)
    const first = guard.onDiskChange()
    await guard.onDiskChange()
    answerDiskChangePrompt('reload')
    await first
    expect(state.reloads).toBe(1)
    expect(diskChangePrompt.value).toBeNull()
  })

  test('withdrawing drops the question without reloading', async () => {
    const { state, guard } = harness(true)
    const change = guard.onDiskChange()
    guard.withdraw()
    await change
    expect(state.reloads).toBe(0)
    expect(guard.isPending()).toBe(false)
    expect(diskChangePrompt.value).toBeNull()
  })

  test('keeps the question while the document watches the same file again', async () => {
    const { state, guard } = harness(true)
    guard.follow('/designs/landing.fig')
    const change = guard.onDiskChange()
    // An ordinary save restarts the watch on the same file.
    guard.follow('/designs/landing.fig')
    expect(guard.isPending()).toBe(true)

    answerDiskChangePrompt('reload')
    await change
    expect(state.reloads).toBe(1)
  })

  test('withdraws the question when the document follows another file after Save As', async () => {
    const { state, guard } = harness(true)
    guard.follow('/designs/landing.fig')
    const change = guard.onDiskChange()

    guard.follow('/designs/landing copy.fig')
    await change
    expect(state.reloads).toBe(0)
    expect(guard.isPending()).toBe(false)
    expect(diskChangePrompt.value).toBeNull()
  })

  test('a question queued behind another tab is asked after the first is answered', async () => {
    const first = harness(true)
    const second = harness(true)
    const firstChange = first.guard.onDiskChange()
    const secondChange = second.guard.onDiskChange()
    const secondId = diskChangePrompt.value?.id

    // Escape on the first question answers Ignore; the second is shown next.
    answerDiskChangePrompt('ignore')
    await firstChange
    expect(first.guard.isPending()).toBe(false)
    expect(second.guard.isPending()).toBe(true)
    expect(diskChangePrompt.value).not.toBeNull()
    expect(diskChangePrompt.value?.id).not.toBe(secondId)

    answerDiskChangePrompt('reload')
    await secondChange
    expect(second.state.reloads).toBe(1)
    expect(first.state.reloads).toBe(0)
    expect(diskChangePrompt.value).toBeNull()
  })
})

describe('disk change prompt', () => {
  test('asks for one document at a time, oldest first', async () => {
    const first = requestDiskChangeChoice('First')
    const second = requestDiskChangeChoice('Second')
    expect(diskChangePrompt.value?.documentName).toBe('First')

    answerDiskChangePrompt('reload')
    expect(await first.choice).toBe('reload')
    expect(diskChangePrompt.value?.documentName).toBe('Second')

    answerDiskChangePrompt('ignore')
    expect(await second.choice).toBe('ignore')
    expect(diskChangePrompt.value).toBeNull()
  })

  test('a withdrawn question leaves the queue and answers ignore', async () => {
    const first = requestDiskChangeChoice('First')
    const second = requestDiskChangeChoice('Second')
    second.withdraw()
    expect(await second.choice).toBe('ignore')
    expect(diskChangePrompt.value?.documentName).toBe('First')
    first.withdraw()
    expect(diskChangePrompt.value).toBeNull()
  })
})
