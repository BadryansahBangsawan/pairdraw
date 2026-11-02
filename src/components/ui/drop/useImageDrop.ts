import { useEventListener } from '@vueuse/core'
import { shallowRef, toValue, type MaybeRefOrGetter, type Ref } from 'vue'

/**
 * Takes images dropped anywhere on `target`, keeping the files `accepts` takes. A drop none of
 * whose files it takes, such as a `.fig`, is left to the window, which opens documents; so are
 * the other files of a mixed drop. A drop it takes whole stops here, so the window does not also
 * try to open those files.
 *
 * The drag shows `dragging` only for items whose type `carries` approves, but the drop judges the
 * files themselves: a system reports no type, or a misleading one, for many files (`.tsx` none,
 * `.ts` video), and `accepts` can tell them by name. The window's own `dragover` lets every file
 * drag drop, so such a drop still reaches the target.
 *
 * Whether a drag carries an image is decided once, when it enters. VueUse's `useDropZone` checks
 * every event and skips its enter/leave count when one fails, which WebKit outside Safari does for
 * files other apps provide late (Yoink, for one), and the overlay then stayed after the drag.
 */
export function useImageDrop(
  target: Ref<HTMLElement | null>,
  options: {
    enabled?: MaybeRefOrGetter<boolean>
    accepts: (file: File) => boolean
    onImages: (files: File[]) => void
    /**
     * Whether a dragged item is one to take, judged by its type alone; images by default. A
     * target that takes other files too, such as the chat's text files, widens it.
     */
    carries?: (item: DataTransferItem) => boolean
  }
) {
  const dragging = shallowRef(false)
  /** The types of the files the current drag carries, which say what a drop would bring. */
  const types = shallowRef<string[]>([])
  const carries =
    options.carries ??
    ((item: DataTransferItem) => item.kind === 'file' && item.type.startsWith('image/'))
  // Enter and leave fire for every element the drag crosses inside the target.
  let depth = 0

  function carriesImage(event: DragEvent) {
    // Only the item types are readable while dragging; the files arrive with the drop.
    return Array.from(event.dataTransfer?.items ?? []).some(carries)
  }

  function reset() {
    depth = 0
    dragging.value = false
  }

  useEventListener(target, 'dragenter', (event: DragEvent) => {
    depth += 1
    if (depth === 1) {
      dragging.value = (toValue(options.enabled) ?? true) && carriesImage(event)
      types.value = Array.from(event.dataTransfer?.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.type)
    }
    if (dragging.value) event.preventDefault()
  })
  useEventListener(target, 'dragover', (event: DragEvent) => {
    if (!dragging.value) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  })
  useEventListener(target, 'dragleave', () => {
    depth = Math.max(0, depth - 1)
    if (depth === 0) dragging.value = false
  })
  useEventListener(target, 'drop', (event: DragEvent) => {
    const looked = dragging.value
    reset()
    if (!looked && !(toValue(options.enabled) ?? true)) return
    const files = Array.from(event.dataTransfer?.files ?? [])
    const taken = files.filter(options.accepts)
    // A drag that looked like ours is ours even when nothing in it is taken.
    if (looked || taken.length > 0) event.preventDefault()
    if (taken.length > 0 && taken.length === files.length) event.stopPropagation()
    if (taken.length > 0) options.onImages(taken)
  })
  // No pointer events reach the page during a drag, so the first one means it ended, even when
  // it ended without a leave or drop reaching the target.
  useEventListener(window, 'pointermove', () => {
    if (dragging.value || depth > 0) reset()
  })

  return { dragging, types }
}
