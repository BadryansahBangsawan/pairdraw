import * as v from 'valibot'

export const RECENT_FILES_LIMIT_MIN = 1
export const RECENT_FILES_LIMIT_MAX = 1000

export const recentFilesLimitSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(RECENT_FILES_LIMIT_MIN),
  v.maxValue(RECENT_FILES_LIMIT_MAX)
)

/** How Home orders the recent files: by name, by when they were last used, or by when added. */
export const recentFilesSortSchema = v.picklist(['last-used', 'name', 'created'])

const recentLocalDocumentSchema = v.object({
  id: v.string(),
  kind: v.literal('local'),
  path: v.string(),
  name: v.string(),
  /** When the file was last opened or saved here. */
  updatedAt: v.string(),
  /** When the file was first added to the recent files; older entries lack it. */
  createdAt: v.optional(v.string())
})

const recentStorageDocumentSchema = v.object({
  id: v.string(),
  kind: v.literal('storage'),
  providerId: v.string(),
  profileId: v.optional(v.string()),
  containerId: v.optional(v.string()),
  documentId: v.string(),
  name: v.string(),
  /** When the document was last opened or saved here. */
  updatedAt: v.string(),
  /** When the document was first added to the recent files; older entries lack it. */
  createdAt: v.optional(v.string())
})

/**
 * A recent document as this device keeps it. Entries kept before Home recorded when a file was
 * first added read as added when they were last used.
 */
export const recentDocumentSchema = v.pipe(
  v.variant('kind', [recentLocalDocumentSchema, recentStorageDocumentSchema]),
  v.transform((document) => ({ ...document, createdAt: document.createdAt ?? document.updatedAt }))
)
