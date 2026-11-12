import { describe, expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { placeBrowserScreenshot } from '@/app/browser/shot'

const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)

describe('placing a browser screenshot', () => {
  test('png bytes become an image file on the canvas', async () => {
    const files: File[] = []
    await placeBrowserScreenshot(
      {
        placeImageFiles: (accepted) => {
          files.push(...accepted)
          return Promise.resolve()
        }
      },
      PNG,
      'View'
    )
    expect(files).toHaveLength(1)
    expect(files[0]?.type).toBe('image/png')
    expect(files[0]?.name).toBe('View.png')
    const bytes = new Uint8Array(await files[0].arrayBuffer())
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })

  test('empty bytes are not placed', async () => {
    let called = false
    await expect(
      placeBrowserScreenshot(
        {
          placeImageFiles: () => {
            called = true
            return Promise.resolve()
          }
        },
        new Uint8Array(),
        'View'
      )
    ).rejects.toThrow('The page returned no picture')
    expect(called).toBe(false)
  })
})
