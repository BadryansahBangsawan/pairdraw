<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import { computed } from 'vue'

import { useFileMessages } from '@open-pencil/vue/i18n'

import {
  isRecentFilesSort,
  RECENT_FILES_SORTS,
  type RecentFilesSort
} from '@/app/recent-files/sort'
import AppButton from '@/components/ui/button/AppButton.vue'
import type { AppButtonSize } from '@/components/ui/button/button'
import { menuItem, useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'

/** Picks the order Home lists recent files in: by name, last used, or when they were added. */
const { size = 'sm' } = defineProps<{ size?: AppButtonSize }>()
const sort = defineModel<RecentFilesSort>({ required: true })
const files = useFileMessages()
const menuUI = useMenuUI({ content: 'min-w-40' })
const itemClass = menuItem({ justify: 'start', class: 'relative pl-7' })

const labels = computed<Record<RecentFilesSort, string>>(() => ({
  'last-used': files.value.sortByLastUsed,
  name: files.value.sortByName,
  created: files.value.sortByCreated
}))

function choose(value: unknown) {
  if (isRecentFilesSort(value)) sort.value = value
}
</script>

<template>
  <DropdownMenuRoot :modal="false">
    <DropdownMenuTrigger as-child>
      <AppButton
        variant="ghost"
        :size="size"
        :aria-label="files.sortFiles({ order: labels[sort] })"
      >
        <template #leading><icon-lucide-arrow-up-down /></template>
        {{ labels[sort] }}
      </AppButton>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent align="end" :side-offset="4" :class="menuUI.content">
        <MenuScrollArea>
          <DropdownMenuRadioGroup :model-value="sort" @update:model-value="choose">
            <DropdownMenuRadioItem
              v-for="option in RECENT_FILES_SORTS"
              :key="option"
              :value="option"
              :class="itemClass"
            >
              <DropdownMenuItemIndicator class="absolute left-2">
                <icon-lucide-check class="size-3.5" />
              </DropdownMenuItemIndicator>
              {{ labels[option] }}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </MenuScrollArea>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
