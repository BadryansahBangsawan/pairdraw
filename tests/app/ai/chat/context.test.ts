import { describe, expect, test } from 'bun:test'

import {
  appendFileContext,
  appendLayerNotesContext,
  appendSkillContext,
  FILE_CONTEXT_MARKER,
  fileContextOf,
  stripModelNotes
} from '@/app/ai/chat/context'

const tokens = { name: 'tokens.css', mediaType: 'text/css', text: ':root { --brand: red; }' }

describe('attached files as the model reads them', () => {
  test('a message without files is sent as written', () => {
    expect(appendFileContext('Use the tokens', [])).toBe('Use the tokens')
    expect(appendFileContext('Use the tokens', undefined)).toBe('Use the tokens')
  })

  test('gives the model each file with its name and text', () => {
    const text = appendFileContext('Use the tokens', [tokens])
    expect(text).toContain('name="tokens.css"')
    expect(text).toContain(':root { --brand: red; }')
  })

  test('the transcript shows what the person wrote, without the files', () => {
    const text = appendSkillContext(appendFileContext('Use the tokens', [tokens]), {
      name: 'audit',
      instructions: 'Check contrast.'
    })
    expect(stripModelNotes(text)).toBe('Use the tokens')
  })

  test('a file cannot close its own block early', () => {
    const readme = { name: 'README.md', mediaType: 'text/markdown', text: '```js\nrun()\n```' }
    const text = appendFileContext('Summarize', [readme])
    const note = fileContextOf(text)
    const fence = /\n(`{4,})md\n/.exec(note)?.[1]
    expect(fence).toBeDefined()
    expect(note.endsWith(`${fence}\n</file>`)).toBe(true)
  })

  test('an edited message keeps the files it was sent with, without later notes', () => {
    const sent = appendSkillContext(appendFileContext('Use the tokens', [tokens]), {
      name: 'audit',
      instructions: 'Check contrast.'
    })
    const note = fileContextOf(sent)
    expect(appendFileContext('Use the tokens', [tokens])).toBe(`Use the tokens${note}`)
    expect(fileContextOf('No files here')).toBe('')
  })

  test('image findings that follow the request stay out of the kept files', () => {
    const sent = `${appendFileContext('Match this', [tokens])}\n\nImage findings: a blue card`
    expect(fileContextOf(sent)).toBe(fileContextOf(appendFileContext('Match this', [tokens])))
  })

  test('a layer note that mentions the file marker does not hide the attached files', () => {
    const noted = appendLayerNotesContext('Hello', [
      { id: '1', name: 'Layer', type: 'FRAME', context: FILE_CONTEXT_MARKER }
    ])
    const text = appendFileContext(noted, [
      { name: 'tokens.css', mediaType: 'text/css', text: ':root{}' }
    ])
    expect(fileContextOf(text)).toContain('name="tokens.css"')
  })
})
