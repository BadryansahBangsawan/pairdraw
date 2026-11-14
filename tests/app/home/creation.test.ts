import { describe, expect, test } from 'bun:test'

import { aiMessages } from '@open-pencil/vue/i18n'

import { CREATION_KIND_IDS, creationKinds, promptForCreationKind } from '@/app/home/creation'

const messages = aiMessages.get()

describe('what Home offers to create', () => {
  test('lists every kind once, in order, with its name', () => {
    expect(creationKinds(messages).map((kind) => kind.id)).toEqual([...CREATION_KIND_IDS])
    expect(creationKinds(messages).every((kind) => kind.label.length > 0)).toBe(true)
  })

  test('a kind adds its guide after the words the person wrote', () => {
    const prompt = promptForCreationKind('A habit tracker', 'mobile', messages)
    expect(prompt.startsWith('A habit tracker\n\n')).toBe(true)
    expect(prompt).toContain(messages.creationGuide({ kind: messages.creationMobile }))
    expect(prompt).toContain('phone-sized frames')
  })

  test('something else, or no choice, sends the words alone', () => {
    expect(promptForCreationKind('A poster', 'other', messages)).toBe('A poster')
    expect(promptForCreationKind('A poster', null, messages)).toBe('A poster')
  })

  test('each kind has a guide of its own', () => {
    const guides = CREATION_KIND_IDS.filter((id) => id !== 'other').map((id) =>
      promptForCreationKind('x', id, messages)
    )
    expect(new Set(guides).size).toBe(guides.length)
  })
})
