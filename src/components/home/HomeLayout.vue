<script setup lang="ts">
/**
 * The home tab: where documents come from on the side, what is there in the middle. Phones get
 * the locations as a menu above the documents instead of the sidebar.
 */
import { tv } from 'tailwind-variants'

import theme from '@/theme/home/layout'

const styles = tv(theme)()
</script>

<template>
  <div :class="styles.root()">
    <div :class="styles.sidebar()">
      <slot name="sidebar" />
    </div>
    <main :class="styles.main()">
      <div :class="styles.content()">
        <div v-if="$slots.locations" :class="styles.locations()"><slot name="locations" /></div>
        <slot />
      </div>
    </main>
  </div>
</template>
