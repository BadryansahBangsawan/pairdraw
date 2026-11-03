import { describe, expect, test } from 'bun:test'

import { chatDocumentId, type ChatDocumentEditor } from '@/app/ai/chat/history/document'

function editor(overrides: Partial<ChatDocumentEditor> = {}): ChatDocumentEditor {
  return {
    state: { documentName: 'Untitled' },
    getSourceIdentity: () => ({ handle: null, path: null }),
    getStorageBinding: () => null,
    getDocumentFilePath: () => null,
    getRecoveryId: () => 'recovery-1',
    ...overrides
  }
}

describe('the document a chat belongs to', () => {
  test('a new document is its recovery copy until it has a draft', () => {
    expect(chatDocumentId(editor())).toBe('recovery:recovery-1')
    expect(chatDocumentId(editor({ getDraftId: () => null }))).toBe('recovery:recovery-1')
  })

  test('a draft keeps its chats when it opens again from Home', () => {
    const first = editor({ getRecoveryId: () => 'tab-a', getDraftId: () => 'draft-1' })
    const reopened = editor({ getRecoveryId: () => 'tab-b', getDraftId: () => 'draft-1' })
    expect(chatDocumentId(first)).toBe(chatDocumentId(reopened))
  })

  test('a saved file outranks the draft it came from', () => {
    const saved = editor({
      getDocumentFilePath: () => '/designs/landing.fig',
      getDraftId: () => 'd'
    })
    expect(chatDocumentId(saved)).toBe('file:/designs/landing.fig')
  })
})
