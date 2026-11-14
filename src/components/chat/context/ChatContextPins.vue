<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useChatContextMessages } from '@pairdraw/vue/i18n'

import { MAX_PINNED_REFERENCES } from '@/app/ai/chat/pins/limits'
import type { ConversationPins } from '@/app/ai/chat/pins/types'
import { pinCount } from '@/app/ai/chat/pins/types'
import type { PendingReference, PinFailure } from '@/app/ai/chat/pins/use'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import iconButtonTheme from '@/theme/button/icon-button'
import pinsTheme from '@/theme/chat/pins'
import { motionStyles } from '@/theme/motion/styles'

import ChatContextPinsReference from './ChatContextPinsReference.vue'

/**
 * What the person pinned to the conversation, from the chat header: a style kit and reference
 * images the model follows in every message of it.
 */
const {
  pins,
  pending = [],
  remaining = MAX_PINNED_REFERENCES,
  editable = true,
  failure = null
} = defineProps<{
  pins: ConversationPins
  pending?: readonly PendingReference[]
  /** Images that can still be pinned. */
  remaining?: number
  /** False for another document's conversation, whose pins only show. */
  editable?: boolean
  failure?: PinFailure | null
}>()
const emit = defineEmits<{
  editStyleKit: []
  removeStyleKit: []
  addReferences: [files: File[]]
  removeReference: [id: string]
  openSettings: []
}>()
const open = defineModel<boolean>('open', { default: false })

const messages = useChatContextMessages()
const styles = tv(pinsTheme)()
const iconButton = tv(iconButtonTheme)
const triggerClass = computed(() => iconButton({ size: 'sm', active: pinCount(pins) > 0 }))
const count = computed(() => pinCount(pins) + pending.length)
const triggerLabel = computed(() =>
  count.value
    ? messages.value.pinnedContextCount({ count: count.value })
    : messages.value.pinnedContext
)
const fonts = computed(() => pins.styleKit?.fonts.join(', ') ?? '')

const fileDialog = useFileDialog({
  accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
  multiple: true,
  reset: true
})
fileDialog.onChange((files) => {
  if (files?.length) emit('addReferences', [...files])
})

const failureText = computed(() => {
  switch (failure) {
    case 'vision-unavailable':
      return messages.value.pinFailedVision
    case 'unsupported':
      return messages.value.pinFailedUnsupported
    case 'too-many':
      return messages.value.pinFailedTooMany({ count: MAX_PINNED_REFERENCES })
    case 'failed':
      return messages.value.pinFailed
    default:
      return null
  }
})
</script>

<template>
  <PopoverRoot v-model:open="open">
    <Tip :label="triggerLabel">
      <PopoverTrigger
        :class="[triggerClass, styles.trigger()]"
        :aria-label="triggerLabel"
        data-test-id="chat-pins-trigger"
      >
        <icon-lucide-pin :class="styles.icon()" />
        <span v-if="count" :class="styles.count()" aria-hidden="true">{{ count }}</span>
      </PopoverTrigger>
    </Tip>
    <PopoverPortal>
      <PopoverContent
        align="end"
        :side-offset="6"
        :class="styles.content()"
        :aria-label="messages.pinnedContext"
        data-test-id="chat-pins"
      >
        <p :class="styles.heading()">{{ messages.pinnedContext }}</p>
        <p :class="styles.description()">
          {{ editable ? messages.pinnedContextDescription : messages.pinnedContextReadOnly }}
        </p>

        <section :class="styles.section()" :aria-label="messages.styleKit">
          <div :class="styles.sectionHeader()">
            <h3 :class="styles.sectionTitle()">{{ messages.styleKit }}</h3>
            <AppButton
              v-if="editable && !pins.styleKit"
              size="xs"
              data-test-id="chat-pins-add-style-kit"
              @click="emit('editStyleKit')"
            >
              <template #leading><icon-lucide-plus /></template>{{ messages.addStyleKit }}
            </AppButton>
          </div>
          <div v-if="pins.styleKit" :class="styles.kit()" data-test-id="chat-pinned-style-kit">
            <div :class="styles.kitHeader()">
              <span :class="styles.kitName()">{{ pins.styleKit.name }}</span>
              <template v-if="editable">
                <IconButton :label="messages.editStyleKit" size="xs" @click="emit('editStyleKit')">
                  <icon-lucide-pencil :class="styles.icon()" />
                </IconButton>
                <IconButton
                  :label="messages.removeStyleKit"
                  size="xs"
                  @click="emit('removeStyleKit')"
                >
                  <icon-lucide-pin-off :class="styles.icon()" />
                </IconButton>
              </template>
            </div>
            <ul v-if="pins.styleKit.colors.length" :class="styles.swatches()">
              <li
                v-for="color in pins.styleKit.colors"
                :key="`${color.name}${color.hex}`"
                :class="styles.swatch()"
                :style="{ backgroundColor: color.hex }"
              >
                <span :class="styles.swatchLabel()">{{
                  color.name ? `${color.name} ${color.hex}` : color.hex
                }}</span>
              </li>
            </ul>
            <p v-if="fonts" :class="styles.kitDetail()">
              {{ messages.styleKitFontList({ fonts }) }}
            </p>
          </div>
          <p v-else :class="styles.empty()">{{ messages.noStyleKit }}</p>
        </section>

        <section :class="styles.section()" :aria-label="messages.referenceImages">
          <div :class="styles.sectionHeader()">
            <h3 :class="styles.sectionTitle()">{{ messages.referenceImages }}</h3>
            <AppButton
              v-if="editable"
              size="xs"
              :disabled="remaining === 0"
              data-test-id="chat-pins-add-images"
              @click="fileDialog.open()"
            >
              <template #leading><icon-lucide-image-plus /></template
              >{{ messages.addReferenceImages }}
            </AppButton>
          </div>
          <ul v-if="pins.references.length || pending.length" :class="styles.references()">
            <ChatContextPinsReference
              v-for="reference in pins.references"
              :key="reference.id"
              :reference="reference"
              :disabled="!editable"
              :ui="{
                root: styles.reference(),
                image: styles.referenceImage(),
                remove: styles.referenceRemove(),
                icon: styles.icon()
              }"
              @remove="emit('removeReference', reference.id)"
            />
            <li v-for="entry in pending" :key="entry.id" :class="styles.pending()">
              <!-- A list item cannot be a status itself, so its contents are. -->
              <span
                role="status"
                class="contents"
                :aria-label="messages.describingReference({ name: entry.name })"
              >
                <icon-lucide-loader-circle
                  :class="[styles.icon(), motionStyles.spinner]"
                  aria-hidden="true"
                />
                <span :class="styles.pendingName()" aria-hidden="true">{{ entry.name }}</span>
              </span>
            </li>
          </ul>
          <p v-else :class="styles.empty()">{{ messages.noReferenceImages }}</p>
          <p v-if="editable" :class="styles.hint()">
            {{ messages.referenceLimit({ count: MAX_PINNED_REFERENCES }) }}
          </p>
        </section>

        <AppAlert
          v-if="failureText"
          tone="error"
          :heading="messages.pinFailedHeading"
          :description="failureText"
          :ui="{ root: styles.alert() }"
        >
          <template v-if="failure === 'vision-unavailable'" #actions>
            <AppButton size="xs" variant="outline" @click="emit('openSettings')">
              {{ messages.openAISettings }}
            </AppButton>
          </template>
        </AppAlert>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
