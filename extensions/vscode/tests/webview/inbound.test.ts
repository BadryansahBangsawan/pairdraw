import { describe, expect, test } from 'bun:test'

import { extensionHostData } from '#vscode/webview/inbound'

const editor = { name: 'editor-frame' }
const extensionHost = { name: 'extension-host' }
const load = { type: 'load', name: 'drawing.fig', data: 'YQ==' }

describe('webview host messages', () => {
  test('a message posted by the editor frame is not a host command', () => {
    expect(extensionHostData({ data: load, source: editor }, editor)).toBeNull()
  })

  test('a message from the extension host is the host command', () => {
    expect(extensionHostData({ data: load, source: extensionHost }, editor)).toEqual(load)
  })
})
