<script setup lang="ts">
import { templateRef } from '@vueuse/core'
import { nextTick, watch } from 'vue'
import IconLucidePenTool from '~icons/lucide/pen-tool'
import IconLucideStickyNote from '~icons/lucide/sticky-note'

import type { DocumentKind } from '@open-pencil/scene-graph'
import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import { openFileDialog } from '@/app/shell/menu/use'
import { activeTab } from '@/app/tabs'
import AppButton from '@/components/ui/button/AppButton.vue'
import type { AppButtonColor, AppButtonVariant } from '@/components/ui/button/button'
import AppInput from '@/components/ui/input/AppInput.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import { BOARD_INCLUDED, COLLABORATION_INCLUDED } from '@/constants'

import HomeJoinRoom from './HomeJoinRoom.vue'

/** The place a new design is created in, when it is not a local file. */
const { destination = null } = defineProps<{ destination?: string | null }>()
const emit = defineEmits<{ 'new-document': [kind: DocumentKind] }>()

/**
 * What Home offers to create, side by side, as Figma's Home and New file tab offer theirs. A new
 * design is the page's main action, so it alone is filled, and it comes last, where a row of
 * actions ends.
 */
const CREATE_CHOICES = [
  {
    kind: 'board',
    label: 'createBoard',
    icon: IconLucideStickyNote,
    color: 'neutral',
    variant: 'outline'
  },
  {
    kind: 'design',
    label: 'createDesign',
    icon: IconLucidePenTool,
    color: 'primary',
    variant: 'solid'
  }
] as const satisfies ReadonlyArray<{
  kind: DocumentKind
  label: string
  icon: unknown
  color: AppButtonColor
  variant: AppButtonVariant
}>
/** A build without boards offers a new design alone. */
const createChoices = CREATE_CHOICES.filter((choice) => BOARD_INCLUDED || choice.kind !== 'board')
const query = defineModel<string>({ required: true })
const { menu, files } = useI18n()
const { isMobile, isTouch } = useViewportKind()
const searchInput = templateRef<{ focus: (options?: FocusOptions) => void }>('searchInput')

function focusSearch(onCleanup: (cleanup: () => void) => void): void {
  // Focusing the field would raise a touch screen's keyboard over the page.
  const tab = activeTab.value
  if (isTouch.value || !tab || tab.kind === 'document') return
  const tabId = tab.id
  const previousFocus = document.activeElement
  if (previousFocus instanceof HTMLElement && previousFocus.closest('[role="tablist"]')) return
  let cancelled = false
  onCleanup(() => {
    cancelled = true
  })
  void nextTick(() => {
    if (cancelled || isTouch.value || activeTab.value?.id !== tabId) return
    if (document.activeElement !== previousFocus) return
    searchInput.value?.focus({ preventScroll: true })
  })
}

watch(
  () => activeTab.value?.id,
  (_id, _previousId, onCleanup) => focusSearch(onCleanup),
  { immediate: true, flush: 'post' }
)
</script>

<template>
  <!-- A row once the documents card is wide enough (`@container/home`), a stack before. -->
  <div class="mb-6 flex flex-col gap-3 @2xl/home:mb-8 @2xl/home:flex-row @2xl/home:items-center">
    <AppInput
      ref="searchInput"
      v-model="query"
      type="search"
      name="file-search"
      autocomplete="off"
      class="@2xl/home:flex-1"
      size="md"
      :density="isTouch ? 'comfortable' : 'compact'"
      :placeholder="isMobile ? files.searchFiles : files.searchRecentAndStorageFiles"
      :aria-label="files.searchFiles"
    >
      <template #leading><icon-lucide-search class="size-4" /></template>
    </AppInput>
    <div class="grid grid-cols-2 gap-2 @2xl/home:contents">
      <div v-if="COLLABORATION_INCLUDED" class="col-span-2 grid @2xl/home:contents">
        <HomeJoinRoom :size="isTouch ? 'lg' : 'md'" />
      </div>
      <AppButton
        :size="isTouch ? 'lg' : 'md'"
        variant="outline"
        class="col-span-2 @2xl/home:col-span-1"
        data-test-id="home-open-file"
        @click="openFileDialog"
      >
        <template #leading><icon-lucide-folder-open class="size-3.5" /></template>
        {{ menu.open }}
      </AppButton>
      <Tip
        v-for="choice in createChoices"
        :key="choice.kind"
        :label="destination ? files.createIn({ place: destination }) : ''"
        :disabled="!destination"
        side="bottom"
      >
        <AppButton
          :size="isTouch ? 'lg' : 'md'"
          :color="choice.color"
          :variant="choice.variant"
          :data-test-id="`home-new-${choice.kind}`"
          @click="emit('new-document', choice.kind)"
        >
          <template #leading><component :is="choice.icon" class="size-3.5" /></template>
          {{ files[choice.label] }}
        </AppButton>
      </Tip>
    </div>
  </div>
</template>
