<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref, useId, watch } from 'vue'

import { useChatContextMessages, useCommonMessages } from '@open-pencil/vue/i18n'

import {
  draftHasContent,
  draftOf,
  normalizeKitColor,
  styleKitFromDraft,
  withDocumentStyles,
  type StyleKitDraft
} from '@/app/ai/chat/pins/kit'
import { MAX_STYLE_KIT_COLORS } from '@/app/ai/chat/pins/limits'
import type { StyleKit } from '@/app/ai/chat/pins/types'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import {
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogRoot
} from '@/components/ui/dialog'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import styleKitTheme from '@/theme/chat/style-kit'

/**
 * Edits the style kit pinned to a chat: its colours, fonts, and direction, starting from scratch
 * or from the document's own colour variables and fonts.
 */
const { kit, documentKit } = defineProps<{
  kit: StyleKit | null
  /** The open document's colours and fonts as a kit, taken when the person asks for them. */
  documentKit?: () => StyleKit
}>()
const emit = defineEmits<{ save: [kit: StyleKit] }>()
const open = defineModel<boolean>('open', { default: false })

const messages = useChatContextMessages()
const common = useCommonMessages()
const styles = tv(styleKitTheme)()
const nameID = useId()
const fontsID = useId()
const notesID = useId()
const colorErrorID = useId()

const draft = ref<StyleKitDraft>(draftOf(kit))
const colorName = ref('')
const colorValue = ref('')
const colorInvalid = ref(false)

// Each opening starts from what is pinned now.
watch(open, (isOpen) => {
  if (!isOpen) return
  draft.value = draftOf(kit)
  colorName.value = ''
  colorValue.value = ''
  colorInvalid.value = false
})

const canAddColor = computed(
  () => colorValue.value.trim() !== '' && draft.value.colors.length < MAX_STYLE_KIT_COLORS
)
const canSave = computed(() => draftHasContent(draft.value))

function addColor() {
  const hex = normalizeKitColor(colorValue.value)
  colorInvalid.value = hex === null
  if (!hex || !canAddColor.value) return
  draft.value.colors = [...draft.value.colors, { name: colorName.value.trim(), hex }]
  colorName.value = ''
  colorValue.value = ''
}

function removeColor(index: number) {
  draft.value.colors = draft.value.colors.filter((_, position) => position !== index)
}

function useDocumentStyles() {
  if (documentKit) draft.value = withDocumentStyles(draft.value, documentKit())
}

function save() {
  if (!canSave.value) return
  emit('save', styleKitFromDraft(draft.value, messages.value.styleKit))
  open.value = false
}

/** The name field takes focus as the dialog opens, rather than its close button. */
function focusName(event: Event) {
  event.preventDefault()
  document.getElementById(nameID)?.focus()
}
</script>

<template>
  <AppDialogRoot
    v-model:open="open"
    size="sm"
    data-test-id="chat-style-kit-dialog"
    @open-auto-focus="focusName"
  >
    <form class="contents" @submit.prevent="save">
      <AppDialogHeader
        :heading="kit ? messages.editStyleKit : messages.addStyleKit"
        :description="messages.styleKitDialogDescription"
        :close-label="common.close"
      />
      <AppDialogBody>
        <div :class="styles.body()">
          <div :class="styles.field()">
            <label :for="nameID" :class="styles.label()">{{ messages.styleKitName }}</label>
            <AppInput
              :id="nameID"
              v-model="draft.name"
              :placeholder="messages.styleKitNamePlaceholder"
              data-test-id="chat-style-kit-name"
            />
          </div>

          <fieldset :class="styles.field()">
            <legend :class="styles.label()">{{ messages.styleKitColors }}</legend>
            <ul v-if="draft.colors.length" :class="styles.colors()">
              <li
                v-for="(color, index) in draft.colors"
                :key="`${index}-${color.hex}`"
                :class="styles.color()"
              >
                <span
                  :class="styles.swatch()"
                  :style="{ backgroundColor: color.hex }"
                  aria-hidden="true"
                />
                <span :class="styles.colorName()">{{ color.name || color.hex }}</span>
                <span v-if="color.name" :class="styles.colorHex()">{{ color.hex }}</span>
                <IconButton
                  :label="messages.removeStyleKitColor({ color: color.name || color.hex })"
                  size="xs"
                  @click="removeColor(index)"
                >
                  <icon-lucide-x class="size-3" />
                </IconButton>
              </li>
            </ul>
            <div :class="styles.addColor()">
              <AppInput
                v-model="colorName"
                :aria-label="messages.styleKitColorName"
                :placeholder="messages.styleKitColorNamePlaceholder"
                @enter.prevent="addColor"
              />
              <AppInput
                v-model="colorValue"
                :aria-label="messages.styleKitColorValue"
                :aria-describedby="colorInvalid ? colorErrorID : undefined"
                :aria-invalid="colorInvalid ? 'true' : undefined"
                :state="colorInvalid ? 'invalid' : 'idle'"
                placeholder="#FF5B2E"
                data-test-id="chat-style-kit-color"
                @enter.prevent="addColor"
              />
              <AppButton size="sm" :disabled="!canAddColor" @click="addColor">
                {{ messages.addStyleKitColor }}
              </AppButton>
            </div>
            <p v-if="colorInvalid" :id="colorErrorID" :class="styles.error()" role="alert">
              {{ messages.styleKitColorInvalid }}
            </p>
          </fieldset>

          <div :class="styles.field()">
            <label :for="fontsID" :class="styles.label()">{{ messages.styleKitFonts }}</label>
            <AppInput
              :id="fontsID"
              v-model="draft.fonts"
              :placeholder="messages.styleKitFontsPlaceholder"
              :aria-describedby="`${fontsID}-hint`"
              data-test-id="chat-style-kit-fonts"
            />
            <p :id="`${fontsID}-hint`" :class="styles.hint()">{{ messages.styleKitFontsHint }}</p>
          </div>

          <div :class="styles.field()">
            <label :for="notesID" :class="styles.label()">{{ messages.styleKitNotes }}</label>
            <AppTextarea
              :id="notesID"
              v-model="draft.notes"
              :rows="4"
              :placeholder="messages.styleKitNotesPlaceholder"
              data-test-id="chat-style-kit-notes"
            />
          </div>
        </div>
      </AppDialogBody>
      <AppDialogFooter>
        <AppButton
          v-if="documentKit"
          size="md"
          :class="styles.documentStyles()"
          data-test-id="chat-style-kit-document"
          @click="useDocumentStyles"
        >
          <template #leading><icon-lucide-swatch-book /></template>
          {{ messages.useDocumentStyles }}
        </AppButton>
        <AppButton size="md" @click="open = false">{{ common.cancel }}</AppButton>
        <AppButton
          type="submit"
          size="md"
          color="primary"
          variant="solid"
          :disabled="!canSave"
          data-test-id="chat-style-kit-save"
        >
          {{ messages.saveStyleKit }}
        </AppButton>
      </AppDialogFooter>
    </form>
  </AppDialogRoot>
</template>
