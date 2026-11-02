import { describe, expect, test } from 'bun:test'

import { fileLinkComponents, fileName, localFilePath } from '@/app/ai/chat/references/files'

describe('links to local files', () => {
  test('reads the path a file URL names on each system', () => {
    expect(localFilePath('file:///Users/me/tokens.css')).toBe('/Users/me/tokens.css')
    expect(localFilePath('file:///Users/me/My%20Designs/hero.png')).toBe(
      '/Users/me/My Designs/hero.png'
    )
    expect(localFilePath('file:///C:/Users/me/tokens.css')).toBe('C:/Users/me/tokens.css')
    expect(localFilePath('file://server/share/tokens.css')).toBe('//server/share/tokens.css')
    expect(localFilePath('file://localhost/etc/hosts')).toBe('/etc/hosts')
  })

  test('names no file for other URLs or a bare root', () => {
    expect(localFilePath('https://example.com/tokens.css')).toBeNull()
    expect(localFilePath('file:///')).toBeNull()
    expect(localFilePath('not a url')).toBeNull()
    expect(localFilePath('file:///%E0%A4%A')).toBeNull()
  })

  test('a link without a label shows the file name', () => {
    expect(fileName('/Users/me/tokens.css')).toBe('tokens.css')
    expect(fileName('C:\\Users\\me\\notes.md')).toBe('notes.md')
  })

  test('turns labelled links and autolinks into file components', () => {
    expect(fileLinkComponents('See [the tokens](file:///Users/me/tokens.css).')).toBe(
      'See :chat-file[the tokens]{path="/Users/me/tokens.css" label="the tokens"}.'
    )
    expect(fileLinkComponents('Saved to <file:///tmp/out.svg>')).toBe(
      'Saved to :chat-file[out.svg]{path="/tmp/out.svg" label="out.svg"}'
    )
    expect(fileLinkComponents('[hero](<file:///Users/me/My Designs/hero.png>)')).toBe(
      ':chat-file[hero]{path="/Users/me/My Designs/hero.png" label="hero"}'
    )
  })

  test('leaves web links and file URLs that name nothing as written', () => {
    const markdown = '[Docs](https://example.com) and [root](file:///)'
    expect(fileLinkComponents(markdown)).toBe(markdown)
  })

  test('keeps a path and label from breaking out of the component', () => {
    expect(fileLinkComponents('[a "b"](file:///tmp/a%22b.txt)')).toBe(
      ':chat-file[a "b"]{path="/tmp/a&quot;b.txt" label="a &quot;b&quot;"}'
    )
  })
})
