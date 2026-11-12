import { describe, expect, test } from 'bun:test'

import { exportFileName, exportSelection, fileExtensionForMimeType } from '#vscode/commands/export'

const written: { path: string; data: Uint8Array }[] = []
const saved: { defaultUri?: { path: string }; filters?: Record<string, string[]> }[] = []
let chosen: { path: string } | undefined = { path: '/workspace/drawing.png' }

const host = {
  readFile: () => Promise.resolve(new Uint8Array()),
  writeFile: (uri: { path: string }, data: Uint8Array) => {
    written.push({ path: uri.path, data })
    return Promise.resolve()
  },
  showError: () => undefined,
  saveDialog: (options: (typeof saved)[number]) => {
    saved.push(options)
    return Promise.resolve(chosen)
  }
}

/** A document URI stand-in: only `path` and `with` are read by the command. */
const documentURI = {
  path: '/workspace/drawing.fig',
  with: ({ path }: { path: string }) => ({ path })
}

function fakeSession(mimeType: string, data = new Uint8Array([1, 2])) {
  const asked: unknown[] = []
  return {
    asked,
    session: {
      exportSelection: (options: unknown) => {
        asked.push(options)
        return Promise.resolve({ data, mimeType })
      }
    }
  }
}

describe('selection export', () => {
  test('names the export after the document and its image type', () => {
    expect(exportFileName('/a/b/drawing.fig', 'png')).toBe('/a/b/drawing.png')
    expect(exportFileName('/a/b/design.pen', 'jpg')).toBe('/a/b/design.jpg')
    expect(exportFileName('/a/b/no-extension', 'png')).toBe('/a/b/no-extension.png')
    expect(fileExtensionForMimeType('image/png')).toBe('png')
    expect(fileExtensionForMimeType('image/jpeg')).toBe('jpg')
    expect(fileExtensionForMimeType('image/webp')).toBe('webp')
  })

  test('writes the editor bytes where the user chose', async () => {
    written.length = 0
    saved.length = 0
    chosen = { path: '/workspace/drawing.png' }
    const fake = fakeSession('image/png', new Uint8Array([3, 4]))
    await exportSelection(fake.session as never, documentURI as never, host as never)
    expect(fake.asked).toEqual([{ format: 'PNG' }])
    expect(saved[0]).toMatchObject({
      defaultUri: { path: '/workspace/drawing.png' },
      filters: { Image: ['png'] }
    })
    expect(written).toEqual([{ path: '/workspace/drawing.png', data: new Uint8Array([3, 4]) }])
  })

  test('writes nothing when the user cancels the dialog', async () => {
    written.length = 0
    chosen = undefined
    const fake = fakeSession('image/png')
    await exportSelection(fake.session as never, documentURI as never, host as never)
    expect(written).toEqual([])
  })
})
