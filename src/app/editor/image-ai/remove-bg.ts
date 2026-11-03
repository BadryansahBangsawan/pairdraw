import * as v from 'valibot'

import { imageAIFetch, isRasterImage, pngBlob, redactSecret, responseText } from './http'
import { ImageAIAuthError } from './types'

export const REMOVE_BG_NAME = 'remove.bg'
export const REMOVE_BG_KEY_URL = 'https://www.remove.bg/dashboard#api-key'
const REMOVE_BG_ENDPOINT = 'https://api.remove.bg/v1.0/removebg'
/** remove.bg answers within seconds; a minute leaves room for a slow upload. */
const REMOVE_BG_TIMEOUT_MS = 60_000

const removeBgErrorSchema = v.object({
  errors: v.pipe(v.array(v.object({ title: v.string() })), v.minLength(1))
})

/**
 * Cuts the subject of a PNG out onto a transparent background with remove.bg, which answers with
 * the PNG itself at the size it was sent.
 */
export async function removeBackgroundWithRemoveBg(
  image: Uint8Array,
  apiKey: string
): Promise<Uint8Array> {
  const form = new FormData()
  form.append('image_file', pngBlob(image), 'image.png')
  form.append('size', 'auto')
  form.append('format', 'png')
  const response = await imageAIFetch(
    REMOVE_BG_ENDPOINT,
    { method: 'POST', headers: { 'X-Api-Key': apiKey, Accept: 'image/png' }, body: form },
    { timeoutMs: REMOVE_BG_TIMEOUT_MS }
  )
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ImageAIAuthError(REMOVE_BG_NAME)
    }
    const parsed = v.safeParse(
      v.pipe(v.string(), v.parseJson(), removeBgErrorSchema),
      responseText(response)
    )
    const detail = parsed.success ? redactSecret(parsed.output.errors[0].title, apiKey) : ''
    throw new Error(
      detail
        ? `${REMOVE_BG_NAME} failed (${response.status}): ${detail}`
        : `${REMOVE_BG_NAME} failed (${response.status})`
    )
  }
  if (!isRasterImage(response.bytes)) throw new Error(`${REMOVE_BG_NAME} returned no image`)
  return response.bytes
}
