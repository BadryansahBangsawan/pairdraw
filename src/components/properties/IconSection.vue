<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref, watch } from 'vue'

import { iconLayerName } from '@open-pencil/scene-graph/icons'
import { useIcon } from '@open-pencil/vue/controls/icon'
import { useCommonMessages, usePanelMessages } from '@open-pencil/vue/i18n'

import ColorInput from '@/components/ColorPicker/ColorInput.vue'
import IconPicker from '@/components/icon-picker/IconPicker.vue'
import IconPreview from '@/components/icon-picker/IconPreview.vue'
import IconOptionControls from '@/components/properties/icon/IconOptionControls.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import { AppConfirmationDialog } from '@/components/ui/dialog'
import { useHeldContent } from '@/components/ui/overlay/held'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import theme from '@/theme/select/app'

const panels = usePanelMessages()
const common = useCommonMessages()
const {
  frameId,
  name,
  color,
  preview,
  setName,
  modified,
  optionControls,
  options,
  setOption,
  swap,
  reset,
  detach,
  setColor,
  setColorPicking
} = useIcon()
const styles = tv(theme)()

/**
 * A change that draws an edited icon again, waiting for the edits to be given up: another icon
 * picked to replace it, or an option such as its weight.
 */
type PendingChange =
  | { kind: 'swap'; name: string }
  | { kind: 'option'; key: string; value: number | string }

const pending = ref<PendingChange | null>(null)
const pendingShown = useHeldContent(pending)
// The question is about the icon selected when it was asked; another selection drops it, so a
// confirmation never changes an icon it did not describe.
watch(frameId, () => {
  pending.value = null
})

function apply(change: PendingChange) {
  if (change.kind === 'swap') void swap(change.name)
  else void setOption(change.key, change.value)
}

function request(change: PendingChange) {
  if (modified.value) pending.value = change
  else apply(change)
}

function pick(next: string) {
  request({ kind: 'swap', name: next })
}

function confirmPending() {
  const change = pending.value
  pending.value = null
  if (change) apply(change)
}

const confirmation = computed(() => {
  const change = pendingShown.value
  return change?.kind === 'option'
    ? {
        description: panels.value.changeEditedIconDescription,
        confirm: panels.value.redrawIcon
      }
    : {
        description: panels.value.swapEditedIconDescription({
          name: iconLayerName(change?.name ?? '')
        }),
        confirm: panels.value.swapIcon
      }
})
</script>

<template>
  <PanelSection v-if="name" :label="panels.icon">
    <template #actions>
      <span v-if="modified" class="mr-1 text-[11px] text-muted" data-property="icon-modified">
        {{ panels.iconModified }}
      </span>
      <IconButton v-if="modified" :label="panels.resetIcon" @click="reset">
        <icon-lucide-rotate-ccw class="size-3.5" />
      </IconButton>
      <IconButton :label="panels.detachIcon" @click="detach">
        <icon-lucide-unlink class="size-3.5" />
      </IconButton>
    </template>
    <PanelFieldGroup :label="panels.swapIcon">
      <IconPicker
        :heading="panels.swapIcon"
        :selected="name"
        :set="name.slice(0, name.indexOf(':'))"
        @select="pick"
      >
        <template #trigger>
          <button
            type="button"
            aria-haspopup="listbox"
            data-property="icon-name"
            :aria-label="panels.swapIcon"
            :class="styles.trigger()"
          >
            <IconPreview :svg="preview" class="mr-1.5 size-3.5 text-surface" />
            <span :class="styles.value()">
              {{ iconLayerName(name) }}
              <span class="text-muted">{{ setName ?? name.slice(0, name.indexOf(':')) }}</span>
            </span>
            <icon-lucide-chevron-down class="ml-1 size-3 shrink-0 text-muted" />
          </button>
        </template>
      </IconPicker>
    </PanelFieldGroup>
    <IconOptionControls
      v-if="optionControls.length > 0"
      class="mt-1.5"
      :controls="optionControls"
      :values="options"
      @change="(key, value) => request({ kind: 'option', key, value })"
    />
    <PanelFieldGroup v-if="color" :label="panels.iconColor" class="mt-1.5">
      <ColorInput
        :color="color"
        editable
        data-property="icon-color"
        @update="setColor"
        @open-change="setColorPicking"
      />
    </PanelFieldGroup>
    <AppConfirmationDialog
      :open="pending !== null"
      :heading="panels.swapEditedIconHeading"
      :description="confirmation.description"
      :cancel-label="common.cancel"
      :confirm-label="confirmation.confirm"
      tone="warning"
      @update:open="(open: boolean) => !open && (pending = null)"
      @confirm="confirmPending"
    />
  </PanelSection>
</template>
