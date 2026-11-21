<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, useId } from 'vue'

import SettingsResetButton from '@/components/settings/layout/SettingsResetButton.vue'
import theme from '@/theme/settings/layout'

/** Sections nest under their surface's title, which some surfaces render as `h2`, not `h1`. */
const { level = 3, modified = false } = defineProps<{ level?: 2 | 3 | 4; modified?: boolean }>()
const emit = defineEmits<{ reset: [] }>()
const headingId = useId()
const headingTag = computed(() => `h${level}` as const)
const styles = tv(theme)()
</script>

<template>
  <section :class="styles.section()" :aria-labelledby="headingId">
    <div :class="styles.header()">
      <div :class="styles.heading()">
        <component :is="headingTag" :id="headingId" :class="styles.title()"
          ><slot name="title"
        /></component>
        <p v-if="$slots.description" :class="styles.description()">
          <slot name="description" />
        </p>
      </div>
      <div v-if="$slots.actions || modified" :class="styles.actions()">
        <slot name="actions" />
        <SettingsResetButton v-if="modified" @reset="emit('reset')" />
      </div>
    </div>
    <slot />
  </section>
</template>
