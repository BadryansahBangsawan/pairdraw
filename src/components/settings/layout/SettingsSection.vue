<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { useId } from 'vue'

import theme from '@/theme/settings/layout'

const headingId = useId()
const styles = tv(theme)()
</script>

<template>
  <section :class="styles.section()" :aria-labelledby="headingId">
    <div :class="styles.header()">
      <div :class="styles.heading()">
        <h3 :id="headingId" :class="styles.title()"><slot name="title" /></h3>
        <p v-if="$slots.description" :class="styles.description()">
          <slot name="description" />
        </p>
      </div>
      <div v-if="$slots.actions" :class="styles.actions()"><slot name="actions" /></div>
    </div>
    <slot />
  </section>
</template>
