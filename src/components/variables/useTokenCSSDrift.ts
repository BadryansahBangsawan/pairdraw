import { useDebounceFn } from '@vueuse/core'
import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'

import type { TokenDrift, TokenDriftKind } from '@pairdraw/core/io/formats/design-tokens'

import type { EditorStore } from '@/app/editor/active-store'
import { tokenCSSDrift, tokenCSSLink } from '@/app/editor/tokens/css-sync'

/** The kind a row shows when a variable differs in several modes: the one most in need of a choice. */
const PRIORITY: readonly TokenDriftKind[] = [
  'conflict',
  'canvas',
  'deleted',
  'missing',
  'code',
  'added'
]

/** Edits arrive in bursts; the stylesheet is read again once they settle. */
const REFRESH_DELAY_MS = 250

/**
 * How the variables differ from the linked stylesheet, kept current only while `open`: read again
 * as it opens and when the link or its text changes, and compared again once edits settle. A
 * closed dialog costs nothing.
 */
export function useTokenCSSDrift(store: EditorStore, open: MaybeRefOrGetter<boolean>) {
  const link = tokenCSSLink(store)
  const drift = shallowRef<TokenDrift[] | null>(null)
  let request = 0

  /** Whether a refresh still to run must read the file again, whatever asked for it later. */
  let reread = false
  const debounced = useDebounceFn(async () => {
    const current = ++request
    const options = { reread }
    reread = false
    let next: TokenDrift[] | null = null
    try {
      next = await tokenCSSDrift(store, options)
    } catch (error) {
      console.warn('[Tokens] Could not compare the linked stylesheet:', error)
    }
    if (current === request) drift.value = next
  }, REFRESH_DELAY_MS)

  function refresh(fromFile: boolean) {
    reread ||= fromFile
    return debounced()
  }

  watch(
    () => toValue(open),
    (isOpen) => {
      if (isOpen) void refresh(true)
    },
    { immediate: true }
  )
  watch([link, () => store.state.sceneVersion], () => {
    if (toValue(open)) void refresh(false)
  })

  const byVariable = computed(() => {
    const kinds = new Map<string, TokenDriftKind>()
    for (const { variableId, kind } of drift.value ?? []) {
      if (!variableId) continue
      const shown = kinds.get(variableId)
      if (!shown || PRIORITY.indexOf(kind) < PRIORITY.indexOf(shown)) kinds.set(variableId, kind)
    }
    return kinds
  })

  return { drift, byVariable }
}
