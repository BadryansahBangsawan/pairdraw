import { readonly, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

/**
 * Whether an overlay has opened yet: false until `open` is first true, then true for good.
 *
 * Content whose code loads on demand mounts with its first showing, through `v-if` on this value,
 * and then stays mounted. A dialog goes through `LazyOverlay`, which also keeps its place in the page.
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
