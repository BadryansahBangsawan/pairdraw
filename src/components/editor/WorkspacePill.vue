<script setup lang="ts">
import { useI18n } from '@open-pencil/vue/i18n'

import { resolvedAppTheme } from '@/app/shell/theme'
import BrandMark from '@/components/brand/BrandMark.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'

/**
 * The pill of the canvas-only layout: the document name and the way back. In preview it says
 * so, resets the controls, and leaves preview.
 */
const {
  documentName,
  mode,
  shortcut,
  rulers = false
} = defineProps<{
  documentName: string
  mode: 'collapsed' | 'preview'
  /** The shortcut of the way back: Toggle UI, or leaving preview. */
  shortcut: string
  /** Whether the canvas draws its rulers, which the pill then sits clear of. */
  rulers?: boolean
}>()
const emit = defineEmits<{ showUi: []; reset: []; leave: [] }>()
const { editor } = useI18n()
</script>

<template>
  <div
    class="absolute start-2.5 top-2.5 z-10 flex items-center gap-2 rounded-xl border border-border bg-panel py-1 ps-1.5 pe-1 elevation-card data-rulers:start-8.5 data-rulers:top-8.5"
    :data-mode="mode"
    :data-rulers="rulers || undefined"
  >
    <BrandMark variant="app-icon" :appearance="resolvedAppTheme" class="size-6" />
    <span data-test-id="editor-document-name" class="text-xs text-surface">{{ documentName }}</span>
    <IconButton
      v-if="mode === 'collapsed'"
      :label="editor.showUI({ shortcut })"
      data-test-id="editor-show-ui"
      class="ms-1"
      @click="emit('showUi')"
    >
      <icon-lucide-sidebar class="size-3.5" />
    </IconButton>
    <template v-else>
      <span
        class="ms-1 flex h-5 items-center gap-1 rounded-md bg-accent/15 px-1.5 text-[10px] font-medium text-surface"
      >
        <icon-lucide-play class="size-3 text-primary" />
        {{ editor.previewing }}
      </span>
      <AppButton size="xs" variant="soft" data-property="preview-reset" @click="emit('reset')">
        <icon-lucide-rotate-ccw class="size-3" />
        {{ editor.resetPreview }}
      </AppButton>
      <IconButton
        :label="editor.leavePreview({ shortcut })"
        data-property="preview-leave"
        @click="emit('leave')"
      >
        <icon-lucide-x class="size-3.5" />
      </IconButton>
    </template>
  </div>
</template>
