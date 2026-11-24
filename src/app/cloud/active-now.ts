import { useIntervalFn } from '@vueuse/core'
import { readonly, ref, watch } from 'vue'

/**
 * A clock that ticks only while `active` reads true. `useNow` cannot pause, so a surface that
 * mounts once and shows a countdown only some of the time kept its timer armed while idle.
 * Reads the current time the moment it becomes active.
 */
export function useActiveNow(active: () => boolean, intervalMs: number) {
  const now = ref(new Date())
  const tick = useIntervalFn(
    () => {
      now.value = new Date()
    },
    intervalMs,
    { immediate: false, immediateCallback: false }
  )
  watch(
    active,
    (live) => {
      if (!live) {
        tick.pause()
        return
      }
      now.value = new Date()
      tick.resume()
    },
    { immediate: true }
  )
  return readonly(now)
}
