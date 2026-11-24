<script setup lang="ts">
import { LAYER_TREE_ROW_HEIGHT } from './geometry'

const { padLeft, contentClass } = defineProps<{ padLeft: string; contentClass: string }>()
</script>

<template>
  <div :style="{ height: `${LAYER_TREE_ROW_HEIGHT}px` }">
    <span data-slot="content" :class="contentClass" :style="{ paddingLeft: padLeft }">
      <slot />
    </span>
    <slot name="end" />
  </div>
</template>
