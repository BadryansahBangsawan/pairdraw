<script setup lang="ts">
import IconSparkles from '~icons/lucide/sparkles'

/** Who wrote a message on the canvas: an orange initial for a person, a violet spark for an agent. */
const { name, actor, when } = defineProps<{
  name: string
  actor: 'human' | 'agent'
  when?: string
}>()
</script>

<template>
  <span class="badge">
    <span class="avatar" :data-actor="actor">
      <IconSparkles v-if="actor === 'agent'" />
      <template v-else>{{ name.charAt(0) }}</template>
    </span>
    {{ name }}
    <span v-if="when" class="when">{{ when }}</span>
  </span>
</template>

<style scoped>
.badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--lp-human);
  font-size: 11px;
}

.avatar[data-actor='agent'] {
  background: var(--lp-agent);
  color: #fff;
}

.avatar svg {
  width: 12px;
  height: 12px;
}

.when {
  color: var(--lp-muted);
  font-size: 13px;
  font-weight: 400;
}
</style>
