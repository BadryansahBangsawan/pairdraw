<script setup lang="ts">
import { computed, useId } from 'vue'

import { useCommonMessages, useMediaMessages } from '@open-pencil/vue/i18n'

import { closeImageAIPrompt, imageAIPrompt, type ImageAIPromptMode } from '@/app/editor/image-ai'
import { useImageAIPromptForm } from '@/app/editor/image-ai/prompt'
import AppButton from '@/components/ui/button/AppButton.vue'
import {
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogRoot
} from '@/components/ui/dialog'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import { useHeldContent } from '@/components/ui/overlay/held'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

/**
 * Asks for the prompt of an image AI request: a new background, an image fill, an image layer, or
 * SVG layers. The request runs once the dialog closes and reports in a toast.
 */
const media = useMediaMessages()
const common = useCommonMessages()
const form = useImageAIPromptForm()
const { prompt, orientation, transparent, canSubmit, submit } = form
const promptID = useId()
const transparentID = useId()

const open = computed({
  get: () => imageAIPrompt.value !== null,
  set: (value) => {
    if (!value) closeImageAIPrompt()
  }
})
// The dialog keeps its mode, and so its labels, while it animates closed.
const mode = useHeldContent<ImageAIPromptMode | null>(form.mode)
const service = useHeldContent(form.service, open)

const copy = computed(() => {
  const messages = media.value
  switch (mode.value) {
    case 'replace-background':
      return {
        title: messages.replaceBackgroundTitle,
        placeholder: messages.replaceBackgroundPlaceholder,
        submit: messages.replace
      }
    case 'generate-fill':
      return {
        title: messages.generateImageFillTitle,
        placeholder: messages.generateImagePlaceholder,
        submit: messages.generate
      }
    case 'generate-svg':
      return {
        title: messages.generateSVGTitle,
        placeholder: messages.generateSVGPlaceholder,
        submit: messages.generate
      }
    default:
      return {
        title: messages.generateImageTitle,
        placeholder: messages.generateImagePlaceholder,
        submit: messages.generate
      }
  }
})
const orientationOptions = computed(() => [
  { value: 'square', label: media.value.imageOrientationSquare },
  { value: 'landscape', label: media.value.imageOrientationLandscape },
  { value: 'portrait', label: media.value.imageOrientationPortrait }
])
const orientationModel = computed({
  get: () => orientation.value,
  set: (value: string) => {
    if (value === 'square' || value === 'landscape' || value === 'portrait') {
      orientation.value = value
    }
  }
})

/** The prompt takes focus as the dialog opens, rather than its close button. */
function focusPrompt(event: Event) {
  event.preventDefault()
  document.getElementById(promptID)?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.code === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <AppDialogRoot
    v-model:open="open"
    size="sm"
    data-test-id="image-ai-prompt-dialog"
    @open-auto-focus="focusPrompt"
  >
    <form class="contents" @submit.prevent="submit">
      <AppDialogHeader :heading="copy.title" :close-label="common.close" />
      <AppDialogBody>
        <div class="flex flex-col gap-3">
          <label :for="promptID" class="text-xs font-medium text-surface">{{
            media.imagePrompt
          }}</label>
          <AppTextarea
            :id="promptID"
            v-model="prompt"
            :rows="3"
            :placeholder="copy.placeholder"
            data-test-id="image-ai-prompt-input"
            @keydown="onKeydown"
          />
          <template v-if="mode === 'generate-image'">
            <div class="flex items-center justify-between gap-3">
              <span class="text-xs text-surface">{{ media.imageOrientation }}</span>
              <SegmentedControl
                v-model="orientationModel"
                :options="orientationOptions"
                :label="media.imageOrientation"
                data-test-id="image-ai-orientation"
              />
            </div>
            <div class="flex items-center gap-2">
              <AppCheckbox
                :id="transparentID"
                v-model="transparent"
                :ariaLabelledby="`${transparentID}-label`"
                data-test-id="image-ai-transparent"
              />
              <label
                :id="`${transparentID}-label`"
                :for="transparentID"
                class="text-xs text-surface"
                >{{ media.transparentBackground }}</label
              >
            </div>
          </template>
          <p class="text-[11px] leading-relaxed text-muted">
            {{ media.imageAIPromptNote({ service }) }}
          </p>
        </div>
      </AppDialogBody>
      <AppDialogFooter>
        <AppButton size="md" @click="closeImageAIPrompt">{{ common.cancel }}</AppButton>
        <AppButton
          type="submit"
          size="md"
          color="primary"
          variant="solid"
          :disabled="!canSubmit"
          data-test-id="image-ai-prompt-submit"
        >
          {{ copy.submit }}
        </AppButton>
      </AppDialogFooter>
    </form>
  </AppDialogRoot>
</template>
