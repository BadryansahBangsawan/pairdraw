<script setup lang="ts">
import { useFocus } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed, ref, useTemplateRef, watch, type Component } from 'vue'
import IconLayoutGrid from '~icons/lucide/layout-grid'
import IconPalette from '~icons/lucide/palette'
import IconSparkles from '~icons/lucide/sparkles'
import IconSwatchBook from '~icons/lucide/swatch-book'
import IconType from '~icons/lucide/type'

import type {
  ClipboardConflictResolution,
  ClipboardImportChoice,
  ClipboardImportPlan
} from '@pairdraw/core'
import type { SharedStyleType } from '@pairdraw/scene-graph'
import { useCommonMessages, useFileMessages } from '@pairdraw/vue/i18n'

import AppButton from '@/components/ui/button/AppButton.vue'
import AppDialogBody from '@/components/ui/dialog/AppDialogBody.vue'
import AppDialogFooter from '@/components/ui/dialog/AppDialogFooter.vue'
import AppDialogHeader from '@/components/ui/dialog/AppDialogHeader.vue'
import AppDialogRoot from '@/components/ui/dialog/AppDialogRoot.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import importDialogTheme, { clipboardImportQuestionUI } from '@/theme/clipboard/import-dialog'

/**
 * Asks how layers pasted from another document bring the variables and styles they use: import
 * them, or paste the layers as they look. A collection or style this document already has by
 * name is used unless its row asks to add the copy under a new name. `open` stays with the
 * caller; closing the dialog here, such as with Escape, answers that the paste is cancelled.
 */
const { open, plan, questionId } = defineProps<{
  open: boolean
  plan: ClipboardImportPlan
  /** Identifies the question shown; a new one starts its choices over. */
  questionId?: number
}>()
const emit = defineEmits<{ answer: [choice: ClipboardImportChoice | null] }>()

const ui = tv(importDialogTheme)()
const files = useFileMessages()
const common = useCommonMessages()
const confirmButton = useTemplateRef('confirmButton')

const STYLE_ICONS: Record<SharedStyleType, Component> = {
  FILL: IconPalette,
  TEXT: IconType,
  EFFECT: IconSparkles,
  GRID: IconLayoutGrid
}

const resolutions = ref<Record<string, ClipboardConflictResolution>>({})
const { focused } = useFocus(confirmButton, { preventScroll: true })
// Choices start over as a question opens, never as it closes, so the closing dialog keeps them.
watch(
  () => [open, questionId] as const,
  ([isOpen]) => {
    if (isOpen) resolutions.value = {}
  },
  { immediate: true }
)

/** Return imports: the dialog opens on Yes, import, not on the first row's choice. */
function focusConfirm(event: Event) {
  event.preventDefault()
  focused.value = true
}

const styleKinds = computed<Record<SharedStyleType, string>>(() => ({
  FILL: files.value.pasteImportFillStyle,
  TEXT: files.value.pasteImportTextStyle,
  EFFECT: files.value.pasteImportEffectStyle,
  GRID: files.value.pasteImportGridStyle
}))

/** The copied collections and styles this document already has one of by name. */
const conflicts = computed(() => [
  ...plan.collections
    .filter((collection) => collection.existing)
    .map((collection) => ({
      id: collection.id,
      name: collection.name,
      meta: files.value.pasteImportVariables(collection.variableCount),
      icon: IconSwatchBook
    })),
  ...plan.styles
    .filter((style) => style.existing)
    .map((style) => ({
      id: style.id,
      name: style.name,
      meta: styleKinds.value[style.type],
      icon: STYLE_ICONS[style.type]
    }))
])

const options = computed(() => [
  { value: 'use-existing', label: files.value.pasteImportUseExisting },
  { value: 'add-renamed', label: files.value.pasteImportAddRenamed }
])

function resolution(id: string): ClipboardConflictResolution {
  return resolutions.value[id] ?? 'use-existing'
}

function setResolution(id: string, value: string) {
  resolutions.value = {
    ...resolutions.value,
    [id]: value === 'add-renamed' ? 'add-renamed' : 'use-existing'
  }
}

function updateOpen(next: boolean) {
  if (!next) emit('answer', null)
}
</script>

<template>
  <AppDialogRoot
    :open="open"
    size="md"
    :ui="conflicts.length === 0 ? clipboardImportQuestionUI : undefined"
    data-test-id="clipboard-import-dialog"
    @update:open="updateOpen"
    @open-auto-focus="focusConfirm"
  >
    <AppDialogHeader
      :heading="files.pasteImportHeading"
      :description="files.pasteImportDescription"
      :close-label="common.close"
      :show-close="conflicts.length > 0"
      :ui="conflicts.length === 0 ? clipboardImportQuestionUI : undefined"
    />

    <AppDialogBody v-if="conflicts.length > 0">
      <section :class="ui.conflicts()" aria-labelledby="clipboard-import-conflicts">
        <h3 id="clipboard-import-conflicts" :class="ui.title()">
          {{ files.pasteImportConflicts }}
        </h3>
        <p :class="ui.hint()">{{ files.pasteImportConflictsHint }}</p>
        <ul :class="ui.list()">
          <li
            v-for="conflict in conflicts"
            :key="conflict.id"
            :class="ui.row()"
            data-test-id="clipboard-import-conflict"
          >
            <component :is="conflict.icon" :class="ui.icon()" aria-hidden="true" />
            <span :class="ui.label()">
              <span :class="ui.name()">{{ conflict.name }}</span>
              <span :class="ui.meta()">{{ conflict.meta }}</span>
            </span>
            <SegmentedControl
              :model-value="resolution(conflict.id)"
              :options="options"
              :label="files.pasteImportChoiceLabel({ name: conflict.name })"
              size="md"
              :ui="{ root: ui.choice() }"
              @update:model-value="setResolution(conflict.id, $event)"
            />
          </li>
        </ul>
      </section>
    </AppDialogBody>

    <AppDialogFooter :ui="conflicts.length === 0 ? clipboardImportQuestionUI : undefined">
      <AppButton
        color="neutral"
        variant="ghost"
        :class="ui.cancel()"
        data-test-id="clipboard-import-cancel"
        @click="emit('answer', null)"
      >
        {{ common.cancel }}
      </AppButton>
      <AppButton
        color="neutral"
        variant="outline"
        data-test-id="clipboard-import-as-is"
        @click="emit('answer', { mode: 'as-is' })"
      >
        {{ files.pasteImportAsIs }}
      </AppButton>
      <AppButton
        ref="confirmButton"
        color="primary"
        variant="solid"
        data-test-id="clipboard-import-confirm"
        @click="emit('answer', { mode: 'import', resolutions: { ...resolutions } })"
      >
        {{ files.pasteImportConfirm }}
      </AppButton>
    </AppDialogFooter>
  </AppDialogRoot>
</template>
