import * as v from 'valibot'

import type { CommentRegion, CommentThread } from '../types'

// Lenient on purpose: other tools may write comments, so missing fields get defaults and one
// malformed thread is skipped instead of hiding every comment.
const commentAuthorColorSchema = v.fallback(
  v.optional(v.object({ r: v.number(), g: v.number(), b: v.number(), a: v.number() })),
  undefined
)

/** What a comment and each reply say, who wrote them and when, and whether they were deleted. */
const commentEntry = {
  author: v.fallback(v.string(), ''),
  authorColor: commentAuthorColorSchema,
  text: v.fallback(v.string(), ''),
  createdAt: v.fallback(v.string(), ''),
  deleted: v.optional(v.boolean())
}

const commentReplySchema = v.object({ id: v.string(), ...commentEntry })

/** Points one thread's region may carry; a file asking for more is not a stroke a person drew. */
export const MAX_COMMENT_REGION_POINTS = 512

const finiteSchema = v.pipe(v.number(), v.finite())
const commentPointSchema = v.tuple([finiteSchema, finiteSchema])

/** The stroke a person circled with: its points and width, and the box they span. */
const commentRegionSchema: v.GenericSchema<unknown, CommentRegion> = v.object({
  points: v.pipe(
    v.array(commentPointSchema),
    v.minLength(2),
    v.maxLength(MAX_COMMENT_REGION_POINTS)
  ),
  width: v.pipe(finiteSchema, v.minValue(0)),
  bounds: v.object({
    minX: finiteSchema,
    minY: finiteSchema,
    maxX: finiteSchema,
    maxY: finiteSchema
  })
})

const commentThreadSchema = v.object({
  id: v.string(),
  pageId: v.string(),
  pageName: v.optional(v.string()),
  nodeId: v.optional(v.nullable(v.string())),
  nodeName: v.optional(v.nullable(v.string())),
  offsetX: v.optional(v.number()),
  offsetY: v.optional(v.number()),
  x: v.fallback(v.number(), 0),
  y: v.fallback(v.number(), 0),
  ...commentEntry,
  updatedAt: v.fallback(v.string(), ''),
  resolved: v.fallback(v.boolean(), false),
  resolvedAt: v.optional(v.nullable(v.string())),
  replies: v.fallback(v.array(commentReplySchema), [])
})

/** A list of comment threads as files and rooms hold them; threads that cannot be read are left out. */
export const commentThreadsSchema: v.GenericSchema<unknown, CommentThread[]> = v.pipe(
  v.array(v.unknown()),
  v.transform((items) =>
    items.flatMap((item) => {
      const parsed = v.safeParse(commentThreadSchema, item)
      if (!parsed.success) return []
      const thread = parsed.output
      // A stroke that cannot be read is dropped; the note it was drawn around is still worth keeping.
      const region = v.safeParse(commentRegionSchema, (item as { region?: unknown }).region)
      return [
        {
          ...thread,
          updatedAt: thread.updatedAt || thread.createdAt,
          ...(region.success ? { region: region.output } : {})
        }
      ]
    })
  )
)
