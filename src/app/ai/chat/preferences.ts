import { computed } from 'vue'

import { resolveAgentStepLimit } from '@/app/ai/reply/step-limit'
import {
  appPreferences,
  type ChangePreviewSize,
  type ReasoningDisplay
} from '@/app/settings/preferences/store'

export const maxAgentSteps = computed({
  get: () => resolveAgentStepLimit(appPreferences.value.chat.maxAgentSteps),
  set: (value: number) => {
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, maxAgentSteps: resolveAgentStepLimit(value) }
    }
  }
})

export const reasoningDisplay = computed({
  get: () => appPreferences.value.chat.reasoningDisplay,
  set: (reasoningDisplay: ReasoningDisplay) => {
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, reasoningDisplay }
    }
  }
})

export const changePreviewSize = computed({
  get: () => appPreferences.value.chat.changePreviewSize,
  set: (changePreviewSize: ChangePreviewSize) => {
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, changePreviewSize }
    }
  }
})

/** Whether an empty page offers a prompt over the canvas; Settings → AI turns it off. */
export const canvasPrompt = computed({
  get: () => appPreferences.value.chat.canvasPrompt,
  set: (canvasPrompt: boolean) => {
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, canvasPrompt }
    }
  }
})
