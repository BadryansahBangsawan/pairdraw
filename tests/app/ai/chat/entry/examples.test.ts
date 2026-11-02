import { expect, test } from 'bun:test'

import { PROMPT_EXAMPLE_IDS, promptExamples } from '@/app/ai/chat/entry/examples'

test('every example has a short label and a fuller prompt to write', () => {
  const examples = promptExamples()
  expect(examples.map(({ id }) => id)).toEqual([...PROMPT_EXAMPLE_IDS])
  for (const { label, prompt } of examples) {
    expect(label.length).toBeGreaterThan(0)
    expect(prompt.length).toBeGreaterThan(label.length)
  }
})
