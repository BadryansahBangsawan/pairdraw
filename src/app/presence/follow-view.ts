import { useEventListener } from '@vueuse/core'
import { computed, type MaybeRefOrGetter } from 'vue'

import { useActiveEditorStoreRef, type EditorStore } from '@/app/editor/active-store'

import { follow, followedLabel, presenceOf, releaseFollow } from './registry'

/**
 * Who the active document's view follows, for a canvas pane's frame and banner. Your own
 * input on the canvas — a click, scrolling or zooming — stops following where the view is,
 * and its Stop following button and Escape give the view back as it was. A surface showing
 * several documents at once passes the one it shows.
 */
export function useFollowView(area: MaybeRefOrGetter<HTMLElement | null>, store?: EditorStore) {
  // Presence belongs to the store object itself, not the forwarding proxy components get.
  const activeStoreRef = useActiveEditorStoreRef()
  const storeRef = computed(() => store ?? activeStoreRef.value)
  const label = computed(() => (storeRef.value ? followedLabel(storeRef.value) : null))

  const stop = () => {
    const store = storeRef.value
    if (store && presenceOf(store).following.value) follow(store, null)
  }

  // Pointer input lands on the banner too; its own button stops following with `stop`.
  const release = (event: Event) => {
    const target = event.target
    if (target instanceof Element && target.closest('[data-test-id="follow-frame"]')) return
    const store = storeRef.value
    if (store && presenceOf(store).following.value) releaseFollow(store)
  }

  useEventListener(area, ['pointerdown', 'wheel'], release, { capture: true, passive: true })

  return { label, stop }
}
