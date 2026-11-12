import * as v from 'valibot'

/**
 * What a reading of the open page may say. The page writes the JSON, so it is checked here and
 * the text is cut. Nothing in it is an instruction, and nothing here inserts HTML or adds a layer.
 */

export const BROWSER_ELEMENT_TEXT_LIMIT = 240
export const BROWSER_OUTLINE_TEXT_LIMIT = 80
export const BROWSER_OUTLINE_LIMIT = 24
export const BROWSER_SELECTOR_LIMIT = 500

export const BROWSER_READ_UNREADABLE = 'The page returned nothing we can read.'
export const BROWSER_ELEMENT_MISSING = 'The element is not on the page'
export const BROWSER_SELECTOR_TOO_LONG = 'The selector is too long.'

/** A reply longer than this is refused before it is parsed. */
const MAX_RAW_LENGTH = 64_000

function finite(value: number): boolean {
  return Number.isFinite(value)
}

const elementReadingSchema = v.object({
  tag: v.pipe(v.string(), v.maxLength(40)),
  role: v.pipe(v.string(), v.maxLength(40)),
  text: v.pipe(v.string(), v.maxLength(BROWSER_ELEMENT_TEXT_LIMIT)),
  box: v.object({
    x: v.pipe(v.number(), v.check(finite)),
    y: v.pipe(v.number(), v.check(finite)),
    width: v.pipe(v.number(), v.check(finite)),
    height: v.pipe(v.number(), v.check(finite))
  })
})

const outlineItemSchema = v.object({
  text: v.pipe(v.string(), v.maxLength(BROWSER_OUTLINE_TEXT_LIMIT)),
  selector: v.pipe(v.string(), v.maxLength(BROWSER_SELECTOR_LIMIT))
})

const pageOutlineSchema = v.object({
  headings: v.pipe(
    v.array(
      v.object({
        ...outlineItemSchema.entries,
        level: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(6))
      })
    ),
    v.maxLength(BROWSER_OUTLINE_LIMIT)
  ),
  links: v.pipe(
    v.array(
      v.object({
        ...outlineItemSchema.entries,
        href: v.pipe(v.string(), v.maxLength(BROWSER_OUTLINE_TEXT_LIMIT))
      })
    ),
    v.maxLength(BROWSER_OUTLINE_LIMIT)
  ),
  buttons: v.pipe(v.array(outlineItemSchema), v.maxLength(BROWSER_OUTLINE_LIMIT)),
  inputs: v.pipe(
    v.array(
      v.object({
        label: v.pipe(v.string(), v.maxLength(BROWSER_OUTLINE_TEXT_LIMIT)),
        type: v.pipe(v.string(), v.maxLength(40)),
        selector: v.pipe(v.string(), v.maxLength(BROWSER_SELECTOR_LIMIT))
      })
    ),
    v.maxLength(BROWSER_OUTLINE_LIMIT)
  )
})

type ElementReading = v.InferOutput<typeof elementReadingSchema>
type PageOutline = v.InferOutput<typeof pageOutlineSchema>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cut(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null
  const flat = value.replace(/\s+/g, ' ').trim()
  return flat.length > limit ? flat.slice(0, limit) : flat
}

/** A link address the model may see. Anything else, including a script address, is dropped. */
function publicHref(value: unknown): string | null {
  const text = cut(value, BROWSER_OUTLINE_TEXT_LIMIT)
  if (text === null) return null
  const lower = text.toLowerCase()
  if (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    text.startsWith('/') ||
    text.startsWith('#') ||
    text.startsWith('?') ||
    text.startsWith('./') ||
    text.startsWith('../')
  ) {
    return text
  }
  return ''
}

function pageValue(raw: string): unknown {
  if (raw.length > MAX_RAW_LENGTH) return undefined
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), v.unknown()), raw)
  return parsed.success ? parsed.output : undefined
}

function elementFrom(value: unknown): ElementReading | null {
  if (!isRecord(value)) return null
  const tag = cut(value.tag, 40)
  const role = cut(value.role, 40)
  const text = cut(value.text, BROWSER_ELEMENT_TEXT_LIMIT)
  const box = value.box
  if (tag === null || role === null || text === null || !isRecord(box)) return null
  const checked = v.safeParse(elementReadingSchema, { tag, role, text, box })
  return checked.success ? checked.output : null
}

function outlineItems<T>(value: unknown, map: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null
  const items: T[] = []
  for (const item of value) {
    if (items.length >= BROWSER_OUTLINE_LIMIT) break
    const mapped = map(item)
    if (mapped) items.push(mapped)
  }
  return items
}

function outlineFrom(value: unknown): PageOutline | null {
  if (!isRecord(value)) return null
  const headings = outlineItems(value.headings, (item) => {
    if (!isRecord(item) || typeof item.level !== 'number') return null
    const text = cut(item.text, BROWSER_OUTLINE_TEXT_LIMIT)
    const selector = cut(item.selector, BROWSER_SELECTOR_LIMIT)
    if (text === null || selector === null) return null
    return { level: item.level, text, selector }
  })
  const links = outlineItems(value.links, (item) => {
    if (!isRecord(item)) return null
    const text = cut(item.text, BROWSER_OUTLINE_TEXT_LIMIT)
    const href = publicHref(item.href)
    const selector = cut(item.selector, BROWSER_SELECTOR_LIMIT)
    if (text === null || href === null || selector === null) return null
    return { text, href, selector }
  })
  const buttons = outlineItems(value.buttons, (item) => {
    if (!isRecord(item)) return null
    const text = cut(item.text, BROWSER_OUTLINE_TEXT_LIMIT)
    const selector = cut(item.selector, BROWSER_SELECTOR_LIMIT)
    if (text === null || selector === null) return null
    return { text, selector }
  })
  const inputs = outlineItems(value.inputs, (item) => {
    if (!isRecord(item)) return null
    const label = cut(item.label, BROWSER_OUTLINE_TEXT_LIMIT)
    const type = cut(item.type, 40)
    const selector = cut(item.selector, BROWSER_SELECTOR_LIMIT)
    if (label === null || type === null || selector === null) return null
    return { label, type, selector }
  })
  if (!headings || !links || !buttons || !inputs) return null
  const checked = v.safeParse(pageOutlineSchema, { headings, links, buttons, inputs })
  return checked.success ? checked.output : null
}

/** One element's reading, or a thrown fixed sentence. A miss is not a layer. */
export function acceptElementReading(raw: string): Record<string, unknown> {
  const value = pageValue(raw)
  if (isRecord(value) && value.missing === true) throw new Error(BROWSER_ELEMENT_MISSING)
  const element = elementFrom(value)
  if (!element) throw new Error(BROWSER_READ_UNREADABLE)
  return { untrustedPageText: true, ...element }
}

/** The page outline, or a thrown fixed sentence. Link addresses that are not pages are blank. */
export function acceptPageOutline(raw: string): Record<string, unknown> {
  const outline = outlineFrom(pageValue(raw))
  if (!outline) throw new Error(BROWSER_READ_UNREADABLE)
  return { untrustedPageText: true, ...outline }
}
