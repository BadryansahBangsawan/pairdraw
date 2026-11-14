import * as v from 'valibot'

import type { ChatReference } from './link'

/**
 * A chat chip that names one element of the built-in browser. The id is one JSON object so the
 * link stays a single path segment, and the conversation stores that link in the message text.
 */
const ELEMENT_MARK_URL_LIMIT = 2000
const ELEMENT_MARK_SELECTOR_LIMIT = 500

const elementMarkSchema = v.strictObject({
  url: v.pipe(v.string(), v.minLength(1), v.maxLength(ELEMENT_MARK_URL_LIMIT)),
  selector: v.pipe(v.string(), v.minLength(1), v.maxLength(ELEMENT_MARK_SELECTOR_LIMIT))
})

export interface ElementMark {
  url: string
  selector: string
}

/** The reference id for a chip. Null when the address or the selector cannot be stored. */
function elementMarkId(url: string, selector: string): string | null {
  const parsed = v.safeParse(elementMarkSchema, { url, selector })
  if (!parsed.success) return null
  return JSON.stringify(parsed.output)
}

/** The address and selector a chip stored, or null when the id is not one. */
export function parseElementMark(id: string): ElementMark | null {
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), elementMarkSchema), id)
  return parsed.success ? parsed.output : null
}

/** The host a chip names in its accessible label. A bad address stays as written. */
export function elementMarkPage(url: string): string {
  try {
    const host = new URL(url).host
    return host || url
  } catch {
    return url
  }
}

/** A reference the transcript can store. Null when the address, selector, or label is empty. */
export function elementReference(
  url: string,
  selector: string,
  label: string
): ChatReference | null {
  const id = elementMarkId(url, selector)
  if (!id || !label) return null
  return { kind: 'element', id, label }
}
