<script setup lang="ts">
/**
 * The home tab: one column with the prompt first, then the ways to start from something that
 * exists, then the documents under the tabs that say where they come from.
 */
import { tv } from 'tailwind-variants'

import theme from '@/theme/home/layout'

const styles = tv(theme)()
</script>

<template>
  <div :class="styles.root()">
    <main :class="styles.main()">
      <div :class="styles.content()">
        <slot />
      </div>
    </main>
  </div>
</template>
