import { onScopeDispose, ref, watch, type Ref } from 'vue'

/**
 * Plays a tab's small scene once each time the tab is opened: `stage` counts from 0 to `steps`,
 * a step every `interval` milliseconds, and only while the section may move. Visitors who asked
 * for less motion get the last stage at once.
 */
export function useTabScene(
  active: () => boolean,
  running: Ref<boolean>,
  reduced: Ref<boolean>,
  steps: number,
  interval: number
) {
  const stage = ref(0)
  let timer: ReturnType<typeof setTimeout> | undefined

  function stop(): void {
    clearTimeout(timer)
    timer = undefined
  }

  function next(): void {
    timer = undefined
    if (stage.value >= steps || !running.value || !active()) return
    stage.value++
    timer = setTimeout(next, interval)
  }

  watch(
    [active, running, reduced],
    ([open, play, still], previous) => {
      if (still) {
        stop()
        stage.value = steps
        return
      }
      // A tab opened again plays again.
      if (open && previous[0] === false) stage.value = 0
      if (!open) {
        stop()
        return
      }
      if (play && timer === undefined) timer = setTimeout(next, interval)
      else if (!play) stop()
    },
    { immediate: true }
  )
  onScopeDispose(stop)

  return stage
}
