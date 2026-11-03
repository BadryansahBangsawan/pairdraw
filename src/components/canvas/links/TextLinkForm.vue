<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

import { normalizeLinkURL } from '@open-pencil/core/text'
import { useCommonMessages, useEditorMessages } from '@open-pencil/vue/i18n'

import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'

/**
 * Where a text's link goes, typed and checked in place: Apply takes a web or mail address,
 * Open follows the link the text has, and Remove takes it away. Store-free; the link editor on
 * the canvas and stories drive it.
 */
const {
  url = '',
  link = 'none',
  layerName = ''
} = defineProps<{
  /** The address the text links to, shown for editing. */
  url?: string
  /** Whether the text links to an address, a layer, several places, or nowhere. */
  link?: 'none' | 'url' | 'layer' | 'mixed'
  /** The layer or page a link to the document goes to. */
  layerName?: string
}>()

const emit = defineEmits<{
  /** An address the editor links to, as typed. */
  apply: [url: string]
  remove: []
  open: []
  cancel: []
}>()

const messages = useEditorMessages()
const common = useCommonMessages()
const errorId = useId()
const draft = ref(url)
const invalid = ref(false)

watch(
  () => url,
  (value) => {
    draft.value = value
    invalid.value = false
  }
)
watch(draft, () => (invalid.value = false))

const placeholder = computed(() => {
  if (link === 'mixed') return messages.value.textLinkMixed
  if (link === 'layer') return messages.value.textLinkToLayer({ name: layerName })
  return messages.value.textLinkPlaceholder
})

function submit() {
  if (normalizeLinkURL(draft.value) === null) {
    invalid.value = true
    return
  }
  emit('apply', draft.value)
}
</script>

<template>
  <form
    class="flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-1.5 p-2"
    novalidate
    data-property="text-link"
    @submit.prevent="submit"
  >
    <div class="flex items-center gap-1">
      <AppInput
        v-model="draft"
        class="min-w-0 flex-1"
        size="xs"
        :aria-label="messages.textLinkAddress"
        :placeholder="placeholder"
        :state="invalid ? 'invalid' : 'idle'"
        :aria-invalid="invalid || undefined"
        :aria-describedby="invalid ? errorId : undefined"
        inputmode="url"
        autocomplete="url"
        spellcheck="false"
        @keydown.escape.prevent.stop="emit('cancel')"
      />
      <IconButton
        :label="messages.openTextLink"
        :disabled="link === 'none' || link === 'mixed'"
        @click="emit('open')"
      >
        <icon-lucide-external-link class="size-3.5" />
      </IconButton>
      <IconButton v-if="link !== 'none'" :label="messages.removeTextLink" @click="emit('remove')">
        <icon-lucide-unlink class="size-3.5" />
      </IconButton>
      <AppButton type="submit" variant="solid" size="xs">{{ common.apply }}</AppButton>
    </div>
    <p v-if="invalid" :id="errorId" class="text-[11px] text-error" aria-live="polite">
      {{ messages.textLinkInvalid }}
    </p>
  </form>
</template>
