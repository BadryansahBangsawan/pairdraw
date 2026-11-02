<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

import { ACP_AGENTS } from '@open-pencil/core/constants'
import { useSelectionState } from '@open-pencil/vue/editor/selection-state'
import { useI18n } from '@open-pencil/vue/i18n'

import { revokeImagePreviewURL } from '@/app/ai/attachment/image/prepare'
import { MAX_IMAGE_ATTACHMENTS } from '@/app/ai/attachment/image/types'
import {
  MAX_TEXT_ATTACHMENT_BYTES,
  MAX_TEXT_ATTACHMENTS,
  type TextAttachmentRefusal
} from '@/app/ai/attachment/text/types'
import { takeBackMessages } from '@/app/ai/chat/queue'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import { useAIChat } from '@/app/ai/chat/use'
import { designModelProfile } from '@/app/ai/models'
import { openSettingsDialog } from '@/app/settings/dialog'
import ChatDraftFile from '@/components/chat/attachment/ChatDraftFile.vue'
import ChatCreditBalance from '@/components/chat/ChatCreditBalance.vue'
import ChatProfileSelect from '@/components/chat/ChatProfileSelect.vue'
import ChatThinkingSelect from '@/components/chat/ChatThinkingSelect.vue'
import { useComposerCompletions } from '@/components/chat/composer/useComposerCompletions'
import { useAttachmentDrafts } from '@/components/chat/input/useAttachments'
import { chatInputTheme } from '@/components/chat/ui'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppDropOverlay from '@/components/ui/feedback/AppDropOverlay.vue'

import ChatComposer from './ChatComposer.vue'

const { providerID, providerDef, modelID, customModelID } = useAIChat()
const { editor, selectedIds } = useSelectionState()
const { ai } = useI18n()
const ui = chatInputTheme()

const {
  status,
  disabled = false,
  dragging = false,
  draggedTypes = [],
  prompts = []
} = defineProps<{
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  disabled?: boolean
  /** Whether images or files are being dragged over the chat, which shows where they will go. */
  dragging?: boolean
  /** The types of the files being dragged, which say whether they would fit. */
  draggedTypes?: readonly string[]
  /** Prompts sent in this conversation, oldest first, which Up and Down bring back. */
  prompts?: readonly string[]
}>()

const emit = defineEmits<{
  /** `afterWork`: while the agent works, wait until it has finished (Alt+Enter). */
  submit: [submission: ChatSubmission, afterWork: boolean]
  stop: []
  interrupt: []
  error: [message: string]
}>()

function describeFileRefusal(name: string, refusal: TextAttachmentRefusal | 'limit'): string {
  switch (refusal) {
    case 'unsupported':
      return ai.value.fileAttachmentUnsupported({ name })
    case 'too-large':
      return ai.value.fileAttachmentTooLarge({ name, size: MAX_TEXT_ATTACHMENT_BYTES / 1024 })
    case 'not-text':
      return ai.value.fileAttachmentNotText({ name })
    case 'limit':
      return ai.value.fileAttachmentLimit({ name, count: MAX_TEXT_ATTACHMENTS })
  }
}

const attachments = useAttachmentDrafts({
  editor,
  selectedIds,
  reportError: (message) => emit('error', message),
  describeFileRefusal
})
const {
  images,
  files,
  full,
  canMentionSelection,
  selectionMentions,
  openFileDialog,
  addFiles,
  removeImage,
  removeFile,
  handlePaste,
  takeSubmission,
  restoreSubmission
} = attachments

const composer = useTemplateRef<{
  restoreDraft: (text: string) => boolean
  prependDraft: (text: string) => void
  insert: (text: string) => void
  focus: () => void
}>('composer')
const profileSelect = useTemplateRef<{ show: () => void }>('profileSelect')

const completions = useComposerCompletions()

/** Up on the first line takes waiting messages back to edit, their attachments with them. */
function takeBack(): string | null {
  const taken = takeBackMessages()
  if (taken.length === 0) return null
  for (const submission of taken) restoreSubmission(submission)
  return taken.map((submission) => submission.displayText).join('\n')
}

/** Puts back an unsent message with its attachments; releases them if newer text replaced it. */
function restoreDraft(submission: ChatSubmission): void {
  if (composer.value?.restoreDraft(submission.displayText)) restoreSubmission(submission)
  else for (const image of submission.images) revokeImagePreviewURL(image.previewURL)
}

/**
 * Puts back a prompt that waited for setup, with its images, ahead of anything written since:
 * the person may have kept typing while setup ran, and both stay. Returns whether it did.
 */
function restoreWaiting(submission: ChatSubmission): boolean {
  if (!composer.value) return false
  composer.value.prependDraft(submission.displayText)
  restoreSubmission(submission)
  return true
}

/** A reply is on its way, so the credit balance waits to update until it ends. */
const replying = computed(() => status === 'streaming' || status === 'submitted')
/** The drag carries files other than images, which attach as text. */
const draggingText = computed(() => draggedTypes.some((type) => !type.startsWith('image/')))
const draggingImages = computed(() => draggedTypes.some((type) => type.startsWith('image/')))
/** Why files dropped now would not be attached, or null when they would. */
const dropRefusal = computed(() => {
  if (disabled) {
    return draggingText.value ? ai.value.dropFilesAfterReply : ai.value.dropImagesAfterReply
  }
  const imagesFull = images.value.length >= MAX_IMAGE_ATTACHMENTS
  const filesFull = files.value.length >= MAX_TEXT_ATTACHMENTS
  if (imagesFull && (!draggingText.value || filesFull)) {
    return ai.value.dropImagesLimit({ count: MAX_IMAGE_ATTACHMENTS })
  }
  if (filesFull && !draggingImages.value) {
    return ai.value.dropFilesLimit({ count: MAX_TEXT_ATTACHMENTS })
  }
  return null
})
const dropLabel = computed(
  () =>
    dropRefusal.value ??
    (draggingText.value ? ai.value.dropFilesToAttach : ai.value.dropImagesToAttach)
)

/** Attaches images and files dropped on the chat, unless they cannot be attached right now. */
function dropFiles(files: File[]): void {
  if (dropRefusal.value) {
    emit('error', dropRefusal.value)
    return
  }
  void addFiles(files)
}

defineExpose({
  restoreDraft,
  restoreWaiting,
  dropFiles,
  focus: () => composer.value?.focus(),
  /** Opens the model picker, such as to change the agent the chat switched to. */
  openModels: () => profileSelect.value?.show()
})

const isAgentProvider = computed(
  () => providerID.value.startsWith('acp:') || providerID.value === 'harness:pi'
)
const agentName = computed(() => {
  if (providerID.value === 'harness:pi') return 'Pi'
  const agentId = providerID.value.replace('acp:', '')
  return ACP_AGENTS.find((a) => a.id === agentId)?.name ?? agentId
})
const isCustomProvider = computed(
  () => providerID.value === 'openai-compatible' || providerID.value === 'anthropic-compatible'
)
const customModelName = computed(() => customModelID.value.trim())
const usesCustomModel = computed(
  () => !!providerDef.value.supportsCustomModel && !!customModelName.value
)

const selectedModelName = computed(() => {
  if (usesCustomModel.value) return customModelName.value
  if (isCustomProvider.value) return 'No model'
  return providerDef.value.models.find((m) => m.id === modelID.value)?.name ?? modelID.value
})

// The composer switches configured Design-role profiles; raw provider model selection lives in Settings.
const selectedProfileName = computed(
  () => designModelProfile.value?.name ?? selectedModelName.value
)
</script>

<template>
  <ChatComposer
    ref="composer"
    :status="status"
    :disabled="disabled"
    :completions="completions"
    :take-back="takeBack"
    :prompts="() => prompts"
    @submit="(text, afterWork) => emit('submit', takeSubmission(text), afterWork)"
    @stop="emit('stop')"
    @interrupt="emit('interrupt')"
    @paste="handlePaste"
    @settings="openSettingsDialog('ai')"
  >
    <template v-if="images.length || files.length" #attachment>
      <div :class="ui.attachments()">
        <div v-for="(image, index) in images" :key="image.previewURL" :class="ui.image()">
          <img
            :src="image.previewURL"
            :alt="image.file.name"
            width="40"
            height="40"
            :class="ui.imageThumb()"
          />
          <span :class="ui.imageName()">
            {{ image.file.name }}
          </span>
          <IconButton
            :label="ai.removeImageAttachment({ name: image.file.name })"
            size="xs"
            @click="removeImage(index)"
          >
            <icon-lucide-x class="size-3" />
          </IconButton>
        </div>
        <ChatDraftFile
          v-for="(file, index) in files"
          :key="`${index}:${file.name}`"
          :name="file.name"
          @remove="removeFile(index)"
        />
      </div>
    </template>
    <template #overlay>
      <AppDropOverlay
        shape="field"
        :visible="dragging"
        :accepts="!dropRefusal"
        :label="dropLabel"
      />
    </template>
    <template #leading>
      <IconButton
        :label="ai.mentionSelection"
        size="sm"
        :disabled="disabled || !canMentionSelection"
        data-slot="chat-mention-selection"
        @click="composer?.insert(selectionMentions())"
      >
        <icon-lucide-mouse-pointer-2 class="size-4" />
      </IconButton>
      <IconButton
        :label="ai.attachFiles"
        size="sm"
        :disabled="disabled || full"
        @click="openFileDialog()"
      >
        <icon-lucide-paperclip class="size-4" />
      </IconButton>
    </template>
    <template #model>
      <div class="@container flex min-w-0 items-center">
        <!-- An agent picks its own model and thinking, so only the profile can change. -->
        <ChatProfileSelect ref="profileSelect">
          <template #value>
            <span class="min-w-0 truncate">
              {{ isAgentProvider ? agentName : selectedProfileName }}
            </span>
          </template>
        </ChatProfileSelect>
        <template v-if="!isAgentProvider">
          <ChatThinkingSelect />
          <ChatCreditBalance :replying="replying" />
        </template>
      </div>
    </template>
  </ChatComposer>
</template>
