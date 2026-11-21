<script setup lang="ts">
/** The prototype cursor link between two "How it works" frames; `drawn` starts its line. */
defineProps<{ drawn: boolean }>()
</script>

<template>
  <li class="link" aria-hidden="true">
    <svg viewBox="0 0 64 40">
      <path
        pathLength="1"
        :data-drawn="drawn || undefined"
        d="M2 30C22 2 42 2 60 22M52 14L61 23L49 26"
      />
    </svg>
  </li>
</template>

<style scoped>
svg {
  width: 100%;
  max-width: 64px;
  overflow: visible;
}

path {
  fill: none;
  stroke: var(--lp-human);
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.5;
  transition: stroke-dashoffset 600ms var(--lp-ease-out);
}

path[data-drawn] {
  stroke-dashoffset: 0;
}
</style>
