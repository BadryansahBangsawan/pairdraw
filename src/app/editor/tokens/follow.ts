import { readTokenSources } from '@pairdraw/scene-graph/token-sources'

import type { EditorStore } from '@/app/editor/active-store'
import type { EditorPreparationResult } from '@/app/editor/preparation/types'

/** Loads that put a whole document in the store, after which its recorded link is followed. */
const DOCUMENT_LOADS: ReadonlySet<EditorPreparationResult['kind']> = new Set([
  'document-open',
  'document-reload',
  'recovery-restore',
  'storage-open'
])

/** Stores that have followed a stylesheet, the only ones a document load may need to unlink. */
const linkedStores = new WeakSet<EditorStore>()

/** Notes that a store follows a stylesheet, so a later load checks it against the document. */
export function markTokenCSSLinked(store: EditorStore): void {
  linkedStores.add(store)
}

/**
 * Follows the stylesheet a document records as soon as the document is loaded, watching it again
 * if it was watched, and drops a link the new document does not record. A document without a link
 * that never had one costs one plugin-data lookup; the sync code loads only when needed.
 */
async function followRecordedTokenCSS(
  store: EditorStore,
  result: EditorPreparationResult
): Promise<void> {
  if (result.status !== 'completed' || !DOCUMENT_LOADS.has(result.kind)) return
  const recorded = readTokenSources(store.graph).filter((source) => source.kind === 'css')
  if (recorded.length === 0 && !linkedStores.has(store)) return
  const { restoreTokenCSSLink, setTokenCSSLink, tokenCSSLink } =
    await import('@/app/editor/tokens/css-sync')
  const link = tokenCSSLink(store).value
  if (link && !recorded.some((source) => source.id === link.id)) setTokenCSSLink(store, null)
  await restoreTokenCSSLink(store)
}

async function stopFollowingTokenCSS(store: EditorStore): Promise<void> {
  if (!linkedStores.has(store)) return
  const { setTokenCSSLink } = await import('@/app/editor/tokens/css-sync')
  setTokenCSSLink(store, null)
}

function reportFailure(error: unknown) {
  console.warn('[Tokens] Could not follow the linked stylesheet:', error)
}

/**
 * Follows the stylesheet each document loaded into the store records, from the moment it loads,
 * and stops watching it when the store goes away.
 */
export function followLinkedTokenCSS(store: EditorStore): void {
  store.onPreparationEvent('preparation:finished', (result) => {
    followRecordedTokenCSS(store, result).catch(reportFailure)
  })
  store.onDispose(() => {
    stopFollowingTokenCSS(store).catch(reportFailure)
  })
}
