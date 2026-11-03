import { computed, ref, type Ref } from 'vue'

import type { ComponentPropertyDefinition, SceneNode } from '@open-pencil/scene-graph'
import { canCreateInstance, instanceMainComponent } from '@open-pencil/scene-graph/instances'
import { instanceSwapOptions } from '@open-pencil/vue/controls/component-props'

import type { EditorStore } from '@/app/editor/session'

/** A swap with no property behind it offers every component, as an unbound swap property does. */
const ANY_COMPONENT: ComponentPropertyDefinition = {
  id: '',
  name: '',
  type: 'INSTANCE_SWAP',
  defaultValue: ''
}

/**
 * Swapping the selected instance, a nested one included, to any component the document has, as
 * Figma's instance menu does. A component that would then contain itself is listed disabled. The
 * choices are read when the picker opens.
 */
export function useInstanceSwap(node: Ref<SceneNode | null | undefined>, editor: EditorStore) {
  const open = ref(false)
  const instance = computed(() => (node.value?.type === 'INSTANCE' ? node.value : null))
  const current = computed(() =>
    instance.value ? instanceMainComponent(editor.graph, instance.value)?.id : undefined
  )
  // Items for `AppPicker`, whose item type a module outside a component cannot name.
  const items = computed(() => {
    const target = instance.value
    if (!open.value || !target) return []
    const { graph } = editor
    const { parentId } = target
    return instanceSwapOptions(
      graph,
      [...graph.getAllNodes()],
      ANY_COMPONENT,
      current.value ?? ''
    ).map((option) => ({
      value: option.value,
      label: option.label,
      disabled:
        !!option.disabled ||
        !!option.missing ||
        (parentId !== null && !canCreateInstance(graph, option.value, parentId))
    }))
  })

  function swap(componentId: string) {
    const target = instance.value
    if (!target || componentId === current.value) return
    editor.swapInstance(target.id, componentId)
  }

  return { open, instance, current, items, swap }
}
