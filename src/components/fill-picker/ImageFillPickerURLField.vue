<script setup lang="ts">
import { ref, useId } from 'vue'

import { usePanelMessages } from '@pairdraw/vue/i18n'

import AppButton from '@/components/ui/button/AppButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'

/**
 * Where an image fill's image can come from besides a file: an address typed or pasted, loaded
 * when it is submitted. The picker owns loading; this field shows that it is under way and, once
 * it failed, why, until the address is changed.
 */
const { pending = false, error = null } = defineProps<{
  pending?: boolean
  /** Why the last address gave no image, worded for the person. */
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [url: string]
  /** The address was edited, so an error about the last one no longer applies. */
  edit: []
}>()

const panels = usePanelMessages()
const url = ref('')
const errorId = useId()

function submit() {
  const address = url.value.trim()
  if (address && !pending) emit('submit', address)
}

function update(value: string | number) {
  url.value = String(value)
  emit('edit')
}
</script>

<template>
  <!-- The picker words a bad address itself, so the browser's own check stays out of the way. -->
  <form
    class="flex flex-col gap-1"
    novalidate
    data-test-id="fill-picker-image-url"
    @submit.prevent="submit"
  >
    <div class="flex items-center gap-1.5">
      <AppInput
        :model-value="url"
        type="url"
        class="min-w-0 flex-1"
        :placeholder="panels.imageURLPlaceholder"
        :aria-label="panels.imageURL"
        :state="error ? 'invalid' : 'idle'"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        :disabled="pending"
        @update:model-value="update"
      />
      <AppButton
        type="submit"
        size="sm"
        variant="outline"
        :loading="pending"
        :disabled="!url.trim()"
        data-test-id="fill-picker-image-url-submit"
      >
        {{ panels.imageURLLoad }}
      </AppButton>
    </div>
    <p v-if="error" :id="errorId" class="text-[11px] text-error" role="alert">{{ error }}</p>
  </form>
</template>
