<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { tv } from 'tailwind-variants'

import { useI18n } from '@open-pencil/vue/i18n'

import { IMAGE_ATTACHMENT_MEDIA_TYPES } from '@/app/ai/attachment/image/types'
import theme from '@/theme/home/creation'

/**
 * Home's ways to start from something that exists: a Figma file, a page in the browser, or a
 * screenshot the agent rebuilds. The browser is a desktop window, so its card shows only there.
 */
const { browser = false, disabled = false } = defineProps<{
  /** The built-in browser is available, as it is in the desktop app. */
  browser?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ figma: []; browser: []; screenshot: [file: File] }>()
const { ai } = useI18n()
const styles = tv(theme)()
const picker = useFileDialog({
  accept: IMAGE_ATTACHMENT_MEDIA_TYPES.join(','),
  multiple: false,
  reset: true
})
picker.onChange((files) => {
  const file = files?.item(0)
  if (file) emit('screenshot', file)
})
</script>

<template>
  <div :class="styles.cards()">
    <button
      type="button"
      :class="styles.card()"
      :disabled="disabled"
      data-test-id="home-import-figma"
      @click="emit('figma')"
    >
      <icon-lucide-figma :class="styles.cardIcon()" aria-hidden="true" />
      {{ ai.importFromFigma }}
    </button>
    <button
      v-if="browser"
      type="button"
      :class="styles.card()"
      :disabled="disabled"
      data-test-id="home-import-browser"
      @click="emit('browser')"
    >
      <icon-lucide-globe :class="styles.cardIcon()" aria-hidden="true" />
      {{ ai.importFromBrowser }}
    </button>
    <button
      type="button"
      :class="styles.card()"
      :disabled="disabled"
      data-test-id="home-recreate-screenshot"
      @click="picker.open()"
    >
      <icon-lucide-image-plus :class="styles.cardIcon()" aria-hidden="true" />
      {{ ai.recreateScreenshot }}
    </button>
  </div>
</template>
