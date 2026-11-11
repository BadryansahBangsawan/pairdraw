import { useLocalStorage } from '@vueuse/core'
import * as v from 'valibot'

import { recentFilesSortSchema } from './schema'
import type { RecentDocument } from './store'

/** How Home orders the recent files. */
export type RecentFilesSort = v.InferOutput<typeof recentFilesSortSchema>

export const RECENT_FILES_SORTS = recentFilesSortSchema.options
const DEFAULT_RECENT_FILES_SORT: RecentFilesSort = 'last-used'

const RECENT_FILES_SORT_STORAGE_KEY = 'open-pencil:home-files-sort'

function readSort(raw: string): RecentFilesSort {
  const parsed = v.safeParse(recentFilesSortSchema, raw)
  return parsed.success ? parsed.output : DEFAULT_RECENT_FILES_SORT
}

/** The order Home lists recent files in, kept on this device. */
export const recentFilesSort = useLocalStorage<RecentFilesSort>(
  RECENT_FILES_SORT_STORAGE_KEY,
  DEFAULT_RECENT_FILES_SORT,
  { serializer: { read: readSort, write: (sort) => sort }, writeDefaults: false }
)

/** Whether `value` names an order Home can list recent files in. */
export function isRecentFilesSort(value: unknown): value is RecentFilesSort {
  return v.is(recentFilesSortSchema, value)
}

function time(value: string): number {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * The recent documents in `sort` order: names A to Z as `locale` collates them, with numbers in
 * numeric order; last used or added, newest first. Ties keep the order the documents came in.
 */
export function sortRecentDocuments(
  documents: readonly RecentDocument[],
  sort: RecentFilesSort,
  locale: string
): RecentDocument[] {
  if (sort === 'name') {
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' })
    return documents.toSorted((left, right) => collator.compare(left.name, right.name))
  }
  const field = sort === 'created' ? 'createdAt' : 'updatedAt'
  return documents.toSorted((left, right) => time(right[field]) - time(left[field]))
}
