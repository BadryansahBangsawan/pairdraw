import { describe, expect, test } from 'bun:test'

import { capture, element } from '#web-capture-tests/fixtures'

import { encodeWebCaptureClipboard, readWebCaptureClipboard } from '@pairdraw/web-capture'
import {
  CaptureClipboardUnavailableError,
  writeWebCaptureClipboard,
  type WriteCaptureClipboardOptions
} from '@pairdraw/web-capture/capturer'

/** A clipboard that keeps what was written, as text per type. */
function memoryClipboard() {
  const written: Array<Record<string, Promise<Blob>>> = []
  const options: WriteCaptureClipboardOptions = {
    clipboard: {
      async write(items) {
        await Promise.all(items.map((item) => Promise.all(item.types.map((t) => item.getType(t)))))
      }
    },
    createItem(items) {
      written.push(items)
      return {
        presentationStyle: 'unspecified',
        types: Object.keys(items),
        async getType(type) {
          const blob = items[type]
          if (!blob) throw new Error(`No ${type}`)
          return blob
        }
      }
    }
  }
  async function read(type: string): Promise<string> {
    const blob = written.at(-1)?.[type]
    if (!blob) throw new Error(`Nothing was written as ${type}`)
    return (await blob).text()
  }
  return { options, read }
}

describe('writing a capture to the clipboard', () => {
  test('writes the capture as HTML Pairdraw reads back and as its title and address', async () => {
    const clipboard = memoryClipboard()
    const captured = capture(
      element('p', { color: 'rgb(0, 0, 0)' }, [{ type: 'text', text: 'Pro' }])
    )

    await writeWebCaptureClipboard(Promise.resolve(captured), clipboard.options)

    const read = readWebCaptureClipboard(await clipboard.read('text/html'))
    expect(read).toMatchObject({ ok: true, capture: { root: captured.root } })
    expect(await clipboard.read('text/plain')).toBe(encodeWebCaptureClipboard(captured).text)
  })

  test('writes an encoded payload as it is', async () => {
    const clipboard = memoryClipboard()
    await writeWebCaptureClipboard({ html: '<p>Page</p>', text: 'Page' }, clipboard.options)
    expect(await clipboard.read('text/html')).toBe('<p>Page</p>')
  })

  test('fails when the capture fails, so the caller can say why', async () => {
    const clipboard = memoryClipboard()
    const failed = Promise.reject(new Error('The element is not displayed'))
    await expect(writeWebCaptureClipboard(failed, clipboard.options)).rejects.toThrow(
      'not displayed'
    )
  })

  test('reports a page without the asynchronous clipboard', async () => {
    const createItem = memoryClipboard().options.createItem
    await expect(
      writeWebCaptureClipboard(capture(element('p')), { createItem })
    ).rejects.toBeInstanceOf(CaptureClipboardUnavailableError)
  })
})
