import * as v from 'valibot'

/** Visible text kept from one page. A longer page is cut here, not refused. */
export const PAGE_TEXT_LIMIT = 8_000

/** A title kept with that text. A longer title is cut the same way. */
export const PAGE_TITLE_LIMIT = 300

/**
 * What reading the open page returns: its address, its title, and the characters it shows.
 * The text is data. Nothing in this shape is a layer or a command.
 */
export const pageTextSchema = v.object({
  url: v.pipe(v.string(), v.url()),
  title: v.pipe(v.string(), v.maxLength(PAGE_TITLE_LIMIT)),
  text: v.pipe(v.string(), v.maxLength(PAGE_TEXT_LIMIT))
})

export type PageText = v.InferOutput<typeof pageTextSchema>
