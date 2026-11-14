<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

import { usePanelMessages } from '@pairdraw/vue/i18n'
import { useRetainedPopup } from '@pairdraw/vue/lifecycle/retention'

import { htmlExportSettings } from '@/app/document/export/html'
import type { HTMLExportSettings } from '@/app/document/export/types'
import HTMLExportFields from '@/components/export/HTMLExportFields.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'

/** The HTML export settings, which every HTML export on this device uses, behind a button. */
const { showStyling = true, side = 'left' } = defineProps<{
  /** Off where the host already chooses the styling, as the Code panel does. */
  showStyling?: boolean
  side?: 'left' | 'bottom' | 'top'
}>()

const panels = usePanelMessages()

function updateSettings(settings: HTMLExportSettings) {
  htmlExportSettings.value = settings
}
const { open, portalActive } = useRetainedPopup()
const styles = usePopoverUI({
  content: 'w-72 max-w-[calc(100vw-1rem)]',
  header: 'border-b border-border px-3 py-2 text-xs font-medium text-surface',
  body: 'p-3'
})
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <IconButton
        :label="panels.exportHTMLOptions"
        :active="open"
        data-test-id="html-export-options"
        class="shrink-0"
      >
        <icon-lucide-sliders-horizontal class="size-3.5" />
      </IconButton>
    </PopoverTrigger>
    <PopoverPortal v-if="portalActive">
      <PopoverContent
        :side="side"
        align="start"
        :side-offset="8"
        :aria-label="panels.exportHTMLOptions"
        :class="styles.content"
        data-test-id="html-export-options-popover"
      >
        <h3 :class="styles.header">{{ panels.exportHTMLOptions }}</h3>
        <div :class="styles.body">
          <HTMLExportFields
            :model-value="htmlExportSettings"
            :show-styling="showStyling"
            @update:model-value="updateSettings"
          />
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
