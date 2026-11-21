import { onScopeDispose, ref, watch, type Ref } from 'vue'

import { HERO_STEPS, LAST_STEP, LOOP_START, RESET_HOLD, STEP_HOLD } from './storyboard'

/**
 * Plays the hero storyboard while `running`, holding each frame for its time, then clears the
 * finished scene and plays it again from `LOOP_START`. Pausing
 * keeps the time left on the frame, so a scene that scrolls away and back resumes where it was.
 * One timer is pending at most; nothing runs while the scene is paused. `still` jumps to the
 * last frame and stays there, for visitors who asked for less motion.
 */
export function useStoryboard(running: Ref<boolean>, still: Ref<boolean>) {
  const step = ref(0)
  /** The finished scene is clearing before the next loop. */
  const clearing = ref(false)
  /** Loops finished; the buttons stay once the first loop has shown them. */
  const loops = ref(0)

  let timer: ReturnType<typeof setTimeout> | undefined
  let remaining = STEP_HOLD[HERO_STEPS[0]] * 1000
  let startedAt = 0

  function holdOf(index: number): number {
    const name = HERO_STEPS.at(index)
    return name === undefined ? 0 : STEP_HOLD[name] * 1000
  }

  function advance(): void {
    timer = undefined
    if (clearing.value) {
      clearing.value = false
      loops.value++
      step.value = LOOP_START
      remaining = holdOf(LOOP_START)
    } else if (step.value < LAST_STEP) {
      step.value++
      remaining = holdOf(step.value)
    } else {
      clearing.value = true
      remaining = RESET_HOLD * 1000
    }
    schedule()
  }

  function schedule(): void {
    startedAt = performance.now()
    timer = setTimeout(advance, remaining)
  }

  function pause(): void {
    if (timer === undefined) return
    clearTimeout(timer)
    timer = undefined
    remaining = Math.max(0, remaining - (performance.now() - startedAt))
  }

  watch(
    [running, still],
    ([play, stay]) => {
      if (stay) {
        pause()
        clearing.value = false
        step.value = LAST_STEP
      } else if (play && timer === undefined) schedule()
      else if (!play) pause()
    },
    { immediate: true, flush: 'post' }
  )
  onScopeDispose(pause)

  return { step, clearing, loops }
}
