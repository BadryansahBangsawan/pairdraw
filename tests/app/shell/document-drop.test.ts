import { describe, expect, test } from 'bun:test'

import { claimDroppedFiles, unclaimedDroppedFiles } from '@/app/shell/document-drop'

function file(name: string, body = name): File {
  return new File([body], name, { type: 'text/plain', lastModified: 1 })
}

describe('files claimed from a drop', () => {
  test('leaves every file to the window when no target took any', () => {
    const dropped = [{ file: file('notes.md') }, { file: file('design.fig') }]
    expect(unclaimedDroppedFiles(new Event('drop'), dropped)).toEqual(dropped)
  })

  test('skips the files a target took, matched by content as a new File', () => {
    const event = new Event('drop')
    claimDroppedFiles(event, [file('notes.md')])
    const fig = { file: file('design.fig') }

    expect(unclaimedDroppedFiles(event, [{ file: file('notes.md') }, fig])).toEqual([fig])
    expect(unclaimedDroppedFiles(new Event('drop'), [fig])).toEqual([fig])
  })

  test('a claim matches one file, so a second copy still reaches the window', () => {
    const event = new Event('drop')
    claimDroppedFiles(event, [file('a.md')])
    const copy = { file: file('a.md') }

    expect(unclaimedDroppedFiles(event, [{ file: file('a.md') }, copy])).toEqual([copy])
  })
})
