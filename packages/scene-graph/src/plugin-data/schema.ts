import * as v from 'valibot'

/** A quote kept on a sticky. A longer passage is cut before it is stored. */
export const CITATION_QUOTE_LIMIT = 2_000

const CITATION_URL_LIMIT = 2_048
const CITATION_TITLE_LIMIT = 300

/** An http or https page with a host. Other schemes are not citations. */
function isCitedPage(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== ''
  } catch {
    return false
  }
}

/**
 * A page a sticky cites: where it was read, what it was called, the words taken from it, and
 * when. The quote is characters from the page, kept as text.
 */
export const webCitationSchema = v.object({
  url: v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(CITATION_URL_LIMIT),
    v.check(isCitedPage, 'A citation names an http or https page.')
  ),
  title: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(CITATION_TITLE_LIMIT)),
  quote: v.pipe(v.string(), v.trim(), v.maxLength(CITATION_QUOTE_LIMIT)),
  readAt: v.pipe(v.string(), v.isoTimestamp())
})

export type WebCitation = v.InferOutput<typeof webCitationSchema>
