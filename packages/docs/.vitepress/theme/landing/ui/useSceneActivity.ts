import {
  useDocumentVisibility,
  useElementVisibility,
  useMounted,
  usePreferredReducedMotion,
  type MaybeElementRef
} from '@vueuse/core'
import { computed, readonly, ref, watch, type ComputedRef, type Ref } from 'vue'

export interface SceneActivity {
  /** The visitor asked for less motion: show each scene's last state and keep it still. */
  reduced: ComputedRef<boolean>
  /** The scene is on screen in a visible tab and may move. */
  running: ComputedRef<boolean>
  /** The scene has been on screen at least once. */
  seen: Readonly<Ref<boolean>>
}

/**
 * The visitor asked for less motion. False until the page has hydrated, as it is on the server,
 * so the first render matches the server's; CSS holds those scenes still until then.
 */
export function usePrefersReducedMotion(): ComputedRef<boolean> {
  const mounted = useMounted()
  const motion = usePreferredReducedMotion()
  return computed(() => mounted.value && motion.value === 'reduce')
}

/**
 * When a scene of the page may move: only while it is on screen, the tab is visible, and the
 * visitor has not asked for less motion. Scenes below the fold start when they arrive, and
 * nothing runs on the main thread while the tab is hidden.
 */
export function useSceneActivity(target: MaybeElementRef): SceneActivity {
  const visible = useElementVisibility(target, { rootMargin: '0px 0px -10% 0px' })
  const page = useDocumentVisibility()
  const reduced = usePrefersReducedMotion()
  const seen = ref(false)
  watch(visible, (now) => (seen.value ||= now), { immediate: true })
  const running = computed(() => visible.value && page.value === 'visible' && !reduced.value)
  return { reduced, running, seen: readonly(seen) }
}
