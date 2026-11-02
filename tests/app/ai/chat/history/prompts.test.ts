import { describe, expect, test } from 'bun:test'

import type { UIMessage } from 'ai'

import { appendFileContext, appendSkillContext } from '@/app/ai/chat/context'
import { createPromptRecall, sentPrompts } from '@/app/ai/chat/history/prompts'
import { setVisibleMessageText } from '@/app/ai/chat/presentation'

function user(id: string, text: string): UIMessage {
  return { id, role: 'user', parts: [{ type: 'text', text }] }
}

function assistant(id: string, text: string): UIMessage {
  return { id, role: 'assistant', parts: [{ type: 'text', text }] }
}

describe('sent prompts', () => {
  test('lists what the person sent, oldest first, without replies or notes for the model', () => {
    const withFile = appendFileContext('Use these tokens', [
      { name: 'tokens.css', mediaType: 'text/css', text: ':root { --brand: red; }' }
    ])
    const withSkill = appendSkillContext('/audit the page', {
      name: 'audit',
      instructions: 'Check contrast.'
    })
    const messages = [
      user('first', 'Draw a card'),
      assistant('reply', 'Done.'),
      user('second', withFile),
      user('third', withSkill)
    ]
    expect(sentPrompts(messages)).toEqual(['Draw a card', 'Use these tokens', '/audit the page'])
  })

  test('shows a prompt as the transcript does, and lists a repeated prompt once', () => {
    const id = crypto.randomUUID()
    setVisibleMessageText(id, 'Make it blue')
    const messages = [
      user(crypto.randomUUID(), 'Make it blue'),
      user(id, 'Make it blue\n\n[Referenced nodes — identifiers and labels only]'),
      user(crypto.randomUUID(), '   ')
    ]
    expect(sentPrompts(messages)).toEqual(['Make it blue'])
  })
})

describe('prompt recall', () => {
  const prompts = ['First', 'Second', 'Third']

  test('Up from an empty field walks back from the latest prompt, and stops at the oldest', () => {
    const recall = createPromptRecall(() => prompts)
    expect(recall.older('')).toBe('Third')
    expect(recall.older('Third')).toBe('Second')
    expect(recall.older('Second')).toBe('First')
    expect(recall.older('First')).toBeNull()
  })

  test('Down walks forward again and past the latest empties the field', () => {
    const recall = createPromptRecall(() => prompts)
    recall.older('')
    recall.older('Third')
    expect(recall.newer('Second')).toBe('Third')
    expect(recall.newer('Third')).toBe('')
    expect(recall.newer('')).toBeNull()
  })

  test('leaves the arrows to the caret over a draft or an edited recalled prompt', () => {
    const recall = createPromptRecall(() => prompts)
    expect(recall.older('A draft')).toBeNull()
    expect(recall.newer('A draft')).toBeNull()
    expect(recall.older('')).toBe('Third')
    expect(recall.older('Third, but bolder')).toBeNull()
    expect(recall.newer('Third, but bolder')).toBeNull()
  })

  test('has nothing to recall before the first prompt', () => {
    const recall = createPromptRecall(() => [])
    expect(recall.older('')).toBeNull()
  })

  test('starts over from the latest prompt once a new one is sent', () => {
    const sent = ['First']
    const recall = createPromptRecall(() => sent)
    expect(recall.older('')).toBe('First')
    sent.push('Second')
    expect(recall.older('')).toBe('Second')
  })
})
