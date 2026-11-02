import { describe, expect, test } from 'bun:test'

import { isAttachableFile } from '@/app/ai/attachment/accept'
import {
  isAttachableTextFile,
  readTextAttachment,
  textAttachmentPresentations
} from '@/app/ai/attachment/text/prepare'
import { MAX_TEXT_ATTACHMENT_BYTES } from '@/app/ai/attachment/text/types'

describe('text attachments', () => {
  test('attaches Markdown, stylesheets, and code by name, whatever type the system reports', () => {
    expect(isAttachableTextFile(new File(['# Notes'], 'notes.md'))).toBe(true)
    expect(isAttachableTextFile(new File([':root {}'], 'tokens.css'))).toBe(true)
    // Systems report `.ts` as an MPEG transport stream.
    expect(isAttachableTextFile(new File(['export {}'], 'card.ts', { type: 'video/mp2t' }))).toBe(
      true
    )
    expect(isAttachableTextFile(new File(['{}'], 'data', { type: 'application/json' }))).toBe(true)
  })

  test('leaves design files and other binaries to the window', () => {
    expect(isAttachableFile(new File(['fig'], 'design.fig'))).toBe(false)
    expect(isAttachableFile(new File(['zip'], 'archive.zip', { type: 'application/zip' }))).toBe(
      false
    )
    expect(isAttachableFile(new File(['png'], 'shot.png', { type: 'image/png' }))).toBe(true)
  })

  test('reads a text file with its name, type, and size', async () => {
    const file = new File(['a { color: red }'], 'theme.css', { type: 'text/css' })
    expect(await readTextAttachment(file)).toEqual({
      draft: { name: 'theme.css', mediaType: 'text/css', text: 'a { color: red }', size: file.size }
    })
  })

  test('gives a file the system reported no text type for the plain text type', async () => {
    const read = await readTextAttachment(
      new File(['export {}'], 'card.ts', { type: 'video/mp2t' })
    )
    expect('draft' in read && read.draft.mediaType).toBe('text/plain')
  })

  test('says why a file does not attach', async () => {
    expect(await readTextAttachment(new File(['fig'], 'design.fig'))).toEqual({
      refusal: 'unsupported'
    })
    const large = new File(['x'.repeat(MAX_TEXT_ATTACHMENT_BYTES + 1)], 'huge.txt')
    expect(await readTextAttachment(large)).toEqual({ refusal: 'too-large' })
    const binary = new File([new Uint8Array([0xff, 0xfe, 0x00, 0x80])], 'blob.txt')
    expect(await readTextAttachment(binary)).toEqual({ refusal: 'not-text' })
    const nul = new File(['text\u0000more'], 'nul.txt')
    expect(await readTextAttachment(nul)).toEqual({ refusal: 'not-text' })
  })

  test('the sent message lists each file with its text to view', async () => {
    const [shown] = textAttachmentPresentations('message', [
      { name: 'notes.md', mediaType: 'text/markdown', text: '# Plan', size: 6 }
    ])
    expect(shown).toMatchObject({ kind: 'file', messageId: 'message', name: 'notes.md', size: 6 })
    expect(await shown?.preview.text()).toBe('# Plan')
  })
})
