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

/** Whether AI edits play on the canvas while the app's motion allows; Settings → AI turns them off. */
export const animateAIEdits = computed({
  get: () => appPreferences.value.chat.animateEdits,
  set: (animateEdits: boolean) => {
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, animateEdits }
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

/**
 * Whether the built-in chat asks before each call that changes the document; Settings → AI turns
 * it on. Coding agents ask through their own permission requests instead.
 */
export const approveActions = computed({
  get: () => appPreferences.value.chat.approveActions,
  set: (approveActions: boolean) => {
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, approveActions }
    }
  }
})
