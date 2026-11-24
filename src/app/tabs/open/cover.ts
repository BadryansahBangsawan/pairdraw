import { promiseTimeout } from '@vueuse/core'

import { figThumbnailPageId } from '@pairdraw/core/io/formats/fig'
import { renderThumbnail } from '@pairdraw/core/io/formats/raster'

import type { EditorStore } from '@/app/editor/session'
import { cacheRecentFileThumbnail, loadCachedRecentFileThumbnail } from '@/app/recent-files'

const RECENT_FILE_THUMBNAIL_SIZE = 512
const coverThumbnailListeners = new WeakMap<EditorStore, () => void>()

async function cacheOpenedFigCover(path: string, store: EditorStore): Promise<void> {
  if (await loadCachedRecentFileThumbnail(path)) return
  // A document without a page has no cover, so it never waits for a renderer, and a cover page
  // not shown is not loaded: showing it caches the cover then (see watchOpenedFigCover).
  const thumbnailPageId = figThumbnailPageId(store.graph.getPages())
  if (!thumbnailPageId || thumbnailPageId !== store.state.currentPageId) return
  for (let attempt = 0; attempt < 240 && !store.renderer; attempt++) {
    await promiseTimeout(250)
  }
  const renderer = store.renderer
  if (!renderer) {
    console.warn('[Recent files] Thumbnail skipped because the renderer was unavailable')
    return
  }
  const bytes = renderThumbnail(
    renderer.ck,
    renderer,
    store.graph,
    thumbnailPageId,
    RECENT_FILE_THUMBNAIL_SIZE,
    RECENT_FILE_THUMBNAIL_SIZE
  )
  if (!bytes) {
    console.warn('[Recent files] Thumbnail skipped because its page was empty')
    return
  }
  await cacheRecentFileThumbnail(path, bytes)
}

/** Caches the recent file's cover from the opened document, unless one is cached already. */
export function refreshOpenedFigCover(path: string, store: EditorStore): void {
  void cacheOpenedFigCover(path, store).catch((error: unknown) => {
    console.warn('[Recent files] Failed to cache the thumbnail', error)
  })
}

/** Caches the recent file's cover each time the document shows its cover page. */
export function watchOpenedFigCover(path: string, store: EditorStore): void {
  coverThumbnailListeners.get(store)?.()
  const thumbnailPageId = figThumbnailPageId(store.graph.getPages())
  if (!thumbnailPageId) return
  coverThumbnailListeners.set(
    store,
    store.onEditorEvent('page:changed', (pageId) => {
      if (pageId === thumbnailPageId) refreshOpenedFigCover(path, store)
    })
  )
}

/** Stops following the document's cover, as its tab closes. */
export function stopWatchingFigCover(store: EditorStore): void {
  coverThumbnailListeners.get(store)?.()
  coverThumbnailListeners.delete(store)
}
