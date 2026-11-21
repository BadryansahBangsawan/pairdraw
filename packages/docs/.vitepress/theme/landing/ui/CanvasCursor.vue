<script setup lang="ts">
/**
 * Someone's pointer on the canvas, with their name beside it: orange for a person, violet for an
 * agent, as the editor draws presence. The pointer's tip is the element's top left, so placing
 * the element places the tip. Decorative: the scene around it says who is doing what.
 */
const { name, actor } = defineProps<{
  name: string
  /** `you` is the visitor, drawn in white on the orange download frame. */
  actor: 'human' | 'agent' | 'you'
}>()
</script>

<template>
  <span class="cursor" :data-actor="actor" aria-hidden="true">
    <svg class="pointer" width="18" height="22" viewBox="0 0 18 22">
      <path d="M1 1L17 12L9 13L5 21L1 1Z" stroke="#fff" stroke-width="1.5" />
    </svg>
    <span class="label">
      <slot name="icon" />
      {{ name }}
    </span>
  </span>
</template>

<style scoped>
.cursor {
  --cursor-fill: var(--lp-agent);
  --cursor-text: #fff;

  display: inline-flex;
  gap: 2px;
  pointer-events: none;
  white-space: nowrap;
}

.cursor[data-actor='human'] {
  --cursor-fill: var(--lp-human);
  --cursor-text: var(--lp-ink);
}

.cursor[data-actor='you'] {
  --cursor-fill: #fff;
  --cursor-text: var(--lp-ink);
}

.pointer {
  flex: none;
  fill: var(--cursor-fill);
  filter: drop-shadow(0 1px 1px rgb(21 22 26 / 0.18));
}

.label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--cursor-fill);
  color: var(--cursor-text);
  font-size: 13px;
  font-weight: 700;
  line-height: 16px;
}

.label :deep(svg) {
  width: 13px;
  height: 13px;
}
</style>
