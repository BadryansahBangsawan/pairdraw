<script setup lang="ts">
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, normalizeClass, type HTMLAttributes } from 'vue'

import { useFileMessages } from '@open-pencil/vue/i18n'

import type { DocumentSelectMode } from '@/app/home/selection'
import { useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'
import iconButtonTheme from '@/theme/button/icon-button'
import documentEntryTheme from '@/theme/home/document-entry'

import DocumentEntryMenuIcon from './DocumentEntryMenuIcon.vue'
import type { DocumentEntryAction, DocumentEntryMenu } from './types'

const documentEntry = tv(documentEntryTheme)
const iconButton = tv(iconButtonTheme)

const {
  name,
  metadata,
  previewURL,
  view = 'grid',
  disabled = false,
  menu,
  selectable = false,
  selected = false,
  label,
  class: className
} = defineProps<{
  name: string
  metadata: string
  /** What opening the entry does, when that is more than opening the document. */
  label?: string
  previewURL?: string | null
  view?: 'grid' | 'list'
  disabled?: boolean
  /** The entry's menu, opened from its ⋯ button or by right-clicking; none without it. */
  menu?: DocumentEntryMenu
  /** Cmd/Ctrl+click and Shift+click pick the entry instead of opening it. */
  selectable?: boolean
  selected?: boolean
  class?: HTMLAttributes['class']
}>()
const emit = defineEmits<{
  open: []
  /** A menu item was chosen. */
  action: [action: DocumentEntryAction]
  /** A modified click picked the entry: Cmd/Ctrl toggles it, Shift selects a range up to it. */
  select: [mode: DocumentSelectMode]
}>()
const files = useFileMessages()
const styles = computed(() => documentEntry({ view }))
const menuUI = useMenuUI({ content: 'min-w-44', item: 'justify-start gap-2' })

function click(event: MouseEvent) {
  if (selectable && (event.shiftKey || event.metaKey || event.ctrlKey)) {
    // WebKit leaves focus where it was on a click, so the list's keys (Cmd/Ctrl+A, Escape) would
    // never reach it; the picked entry takes focus as it does in other engines.
    if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
    emit('select', event.shiftKey ? 'range' : 'toggle')
    return
  }
  emit('open')
}
</script>

<template>
  <ContextMenuRoot :disabled="!menu">
    <ContextMenuTrigger as-child>
      <div
        data-slot="document-entry"
        :data-selected="selected || undefined"
        :class="styles.root({ class: normalizeClass(className) })"
      >
        <button
          type="button"
          :disabled="disabled"
          :aria-label="label"
          data-slot="trigger"
          :class="styles.trigger()"
          @click="click"
        >
          <span v-if="view === 'grid'" data-slot="preview" :class="styles.preview()">
            <img v-if="previewURL" :src="previewURL" alt="" :class="styles.image()" />
            <slot v-else name="fallback">
              <icon-lucide-file-image :class="styles.fallback()" />
            </slot>
          </span>
          <icon-lucide-circle-check v-else-if="selected" :class="styles.selectedIcon()" />
          <slot v-else name="icon">
            <icon-lucide-file-image :class="styles.icon()" />
          </slot>
          <span data-slot="body" :class="styles.body()">
            <span data-slot="title" :class="styles.title()">
              <span data-slot="name" :class="styles.name()">{{ name }}</span>
              <span v-if="$slots.status" data-slot="status" :class="styles.status()">
                <slot name="status" />
              </span>
            </span>
            <span data-slot="metadata" :class="styles.metadata()">{{ metadata }}</span>
            <span v-if="selected" class="sr-only">{{ files.documentSelected }}</span>
          </span>
          <span v-if="view === 'list'" :class="styles.trailingMetadata()">{{ metadata }}</span>
        </button>
        <span
          v-if="selected && view === 'grid'"
          data-slot="selected-mark"
          aria-hidden="true"
          :class="styles.selectedMark()"
        >
          <icon-lucide-check class="size-3" />
        </span>
        <div v-if="$slots.actions" data-slot="actions" :class="styles.actions()">
          <slot name="actions" />
        </div>
        <DropdownMenuRoot v-if="menu">
          <DropdownMenuTrigger
            :aria-label="menu.actions"
            data-test-id="home-document-actions"
            :class="iconButton({ size: 'xs', class: styles.menuTrigger() })"
          >
            <icon-lucide-ellipsis class="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent align="end" :side-offset="4" :class="menuUI.content">
              <MenuScrollArea>
                <DropdownMenuItem
                  v-for="item in menu.items"
                  :key="item.action"
                  :class="[menuUI.item, styles.menuItem()]"
                  :data-tone="item.action === 'delete' ? 'danger' : undefined"
                  :data-test-id="`home-document-${item.action}`"
                  @select="emit('action', item.action)"
                >
                  <DocumentEntryMenuIcon :action="item.action" :class="styles.menuIcon()" />
                  {{ item.label }}
                </DropdownMenuItem>
              </MenuScrollArea>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
      </div>
    </ContextMenuTrigger>
    <ContextMenuPortal v-if="menu">
      <ContextMenuContent :class="menuUI.content">
        <MenuScrollArea>
          <ContextMenuItem
            v-for="item in menu.items"
            :key="item.action"
            :class="[menuUI.item, styles.menuItem()]"
            :data-tone="item.action === 'delete' ? 'danger' : undefined"
            @select="emit('action', item.action)"
          >
            <DocumentEntryMenuIcon :action="item.action" :class="styles.menuIcon()" />
            {{ item.label }}
          </ContextMenuItem>
        </MenuScrollArea>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
