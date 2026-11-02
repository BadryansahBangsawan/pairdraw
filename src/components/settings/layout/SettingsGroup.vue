<script setup lang="ts">
import { tv } from 'tailwind-variants'

import theme from '@/theme/settings/layout'

const styles = tv(theme)()
</script>

<template>
  <div :class="styles.group()">
    <slot />
  </div>
</template>
