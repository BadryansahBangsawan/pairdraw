import { readonly, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

/**
 * Whether an overlay has opened yet: false until `open` is first true, then true for good.
 *
 * An overlay whose code loads on demand mounts with its first opening, through `v-if` on this
 * value, and then stays mounted, so it still closes through `open` with its exit animation.
 */
export function useOpenedOnce(open: MaybeRefOrGetter<boolean>): Readonly<Ref<boolean>> {
  const opened = shallowRef(toValue(open))
  if (!opened.value) {
    const stop = watch(
      () => toValue(open),
      (isOpen) => {
        if (!isOpen) return
        opened.value = true
        stop()
      }
    )
  }
  return readonly(opened)
}
