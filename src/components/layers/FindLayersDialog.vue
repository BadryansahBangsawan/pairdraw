<script setup lang="ts">
import { DialogDescription, DialogTitle, VisuallyHidden } from 'reka-ui'
import { computed } from 'vue'
import Search from '~icons/lucide/search'
import X from '~icons/lucide/x'

import { useCommandMessages, useCommonMessages } from '@pairdraw/vue/i18n'
import {
  CommandPaletteRoot,
  type CommandPaletteGroup
} from '@pairdraw/vue/primitives/CommandPalette'

import { useEditorStore } from '@/app/editor/active-store'
import { findableLayers, goToLayer } from '@/app/editor/layers/find'
import { useCommandPaletteUI } from '@/components/commands/ui'
import { sceneNodeIcon } from '@/components/icons'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppDialogRoot from '@/components/ui/dialog/AppDialogRoot.vue'

/**
 * Find layers: the shown page's layers by name, in the command palette's list. Top-level layers
 * are listed from the start and nested ones once the search matches them; picking one selects it
 * and brings it into view.
 */
const store = useEditorStore()
const commands = useCommandMessages()
const common = useCommonMessages()
const paletteUI = useCommandPaletteUI()
const labels = computed(() => ({
  searchPlaceholder: commands.value.findLayersPlaceholder,
  searchLabel: commands.value.findLayersTitle,
  paletteLabel: commands.value.findLayersTitle,
  empty: commands.value.findLayersEmpty,
  back: commands.value.paletteBack
}))
/** Built only while the dialog shows, so a closed dialog does not walk the page on every edit. */
const groups = computed<CommandPaletteGroup[]>(() => {
  if (!store.state.findLayersOpen) return []
  return [
    {
      id: 'layers',
      items: findableLayers(store).map(({ node, ancestors }) => ({
        id: `layer:${node.id}`,
        label: node.name,
        description: ancestors.join(' / ') || undefined,
        icon: sceneNodeIcon(node),
        searchOnly: ancestors.length > 0,
        onSelect: () => goToLayer(store, node.id)
      }))
    }
  ]
})

function close() {
  store.state.findLayersOpen = false
}
</script>

<template>
  <AppDialogRoot
    v-model:open="store.state.findLayersOpen"
    size="md"
    surface="floating"
    :ui="{
      content: 'w-[min(40rem,94vw)] p-0',
      overlay: 'bg-black/25'
    }"
    @escape-key-down="close"
  >
    <VisuallyHidden>
      <DialogTitle>{{ commands.findLayersTitle }}</DialogTitle>
      <DialogDescription>{{ commands.findLayersDescription }}</DialogDescription>
    </VisuallyHidden>
    <CommandPaletteRoot
      data-test-id="find-layers"
      :groups="groups"
      :labels="labels"
      :ui="paletteUI"
      @select="close"
    >
      <template #search-leading>
        <Search class="mx-2 size-5 shrink-0 text-muted" />
      </template>
      <template #search-trailing>
        <IconButton class="ml-2" size="md" :label="common.close" @click="close">
          <X class="size-5" />
        </IconButton>
      </template>
      <template #empty>
        <p class="px-4 py-8 text-center text-xs text-muted">
          {{ commands.findLayersEmpty }}
        </p>
      </template>
      <template #item-icon="{ item }">
        <component :is="item.icon" v-if="item.icon" class="size-4" />
      </template>
    </CommandPaletteRoot>
  </AppDialogRoot>
</template>
