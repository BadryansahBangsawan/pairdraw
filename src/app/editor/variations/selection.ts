import { computed } from 'vue'

import { animateViewport } from '@pairdraw/vue/canvas'
import { useSceneComputed } from '@pairdraw/vue/internal/scene-computed'

import { useEditorStore } from '@/app/editor/active-store'

/**
 * The set of variations the selected layer belongs to, and what the Variations section does
 * with it: flip through the versions, show the original, use a version, or discard them all.
 */
export function useSelectedVariationSet() {
  const store = useEditorStore()

  const set = useSceneComputed(() => {
    if (store.state.selectedIds.size !== 1) return null
    const [id] = store.state.selectedIds
    return id ? store.getVariationSet(id) : null
  })

  /** The selected version's place in its set, from 0, or -1 while the section itself is selected. */
  const versionIndex = computed(() => {
    const current = set.value
    if (!current?.version) return -1
    return current.versions.findIndex((version) => version.id === current.version?.id)
  })

  /**
   * Whether the original changed since the newest versions were made. It walks the original's
   * layers, so it is read when another set is selected, not on every edit; selecting the set
   * again reads it afresh.
   */
  const sectionId = computed(() => set.value?.section.id ?? null)
  const originalChanged = computed(() =>
    sectionId.value ? store.isVariationOriginalChanged(sectionId.value) : false
  )

  /** Selects a layer and brings it into view. */
  function show(id: string) {
    store.select([id])
    animateViewport(store, () => store.zoomToSelection())
  }

  /** Shows the version `step` places after the selected one, wrapping around the set. */
  function flip(step: number) {
    const current = set.value
    if (!current || current.versions.length === 0) return
    const index = versionIndex.value
    const from = index === -1 ? (step > 0 ? -1 : 0) : index
    const count = current.versions.length
    show(current.versions[(from + step + count) % count].id)
  }

  function goToOriginal() {
    const original = set.value?.original
    if (original) show(original.id)
  }

  function pickSelectedVersion() {
    const current = set.value
    if (current?.version && current.pickProblem === null) store.pickVariation(current.version.id)
  }

  function discardAll() {
    const current = set.value
    if (current) store.discardVariations(current.section.id)
  }

  return {
    set,
    versionIndex,
    originalChanged,
    show,
    previous: () => flip(-1),
    next: () => flip(1),
    goToOriginal,
    pickSelectedVersion,
    discardAll
  }
}
