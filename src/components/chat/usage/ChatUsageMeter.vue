<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed } from 'vue'

import { useChatUsageMessages } from '@pairdraw/vue/i18n'

import { formatTokens } from '@/app/ai/chat/context-window/meter'
import { formatCostUsd, type TurnUsage } from '@/app/ai/chat/usage/aggregate'
import { chatUsageMeterTheme } from '@/components/chat/ui'
import Tip from '@/components/ui/overlay/Tip.vue'

/**
 * The tokens one reply spent, with its estimated cost when the model's price is known: a quiet
 * figure in the chat header or under a reply that opens the breakdown it counted.
 */
const {
  usage,
  costUsd = null,
  scope = 'turn'
} = defineProps<{
  usage: TurnUsage
  /** The estimated cost in US dollars, or null when the model's price is unknown. */
  costUsd?: number | null
  /** Whether the figure names one reply or the whole conversation. */
  scope?: 'turn' | 'chat'
}>()

const styles = chatUsageMeterTheme()
const messages = useChatUsageMessages()

const tokens = computed(() => formatTokens(usage.inputTokens + usage.outputTokens))
const cost = computed(() => (costUsd === null ? null : formatCostUsd(costUsd)))
const label = computed(() => {
  const params = { tokens: tokens.value, cost: cost.value ?? '' }
  if (scope === 'chat') {
    return cost.value === null
      ? messages.value.chatTokens(params)
      : messages.value.chatTokensCost(params)
  }
  return cost.value === null
    ? messages.value.turnTokens(params)
    : messages.value.turnTokensCost(params)
})
const rows = computed(() => {
  const list: { label: string; value: number }[] = [
    { label: messages.value.usageInput, value: usage.inputTokens }
  ]
  if (usage.cacheReadTokens)
    list.push({ label: messages.value.usageCachedInput, value: usage.cacheReadTokens })
  list.push({ label: messages.value.usageOutput, value: usage.outputTokens })
  if (usage.reasoningTokens)
    list.push({ label: messages.value.usageReasoning, value: usage.reasoningTokens })
  return list
})
</script>

<template>
  <PopoverRoot>
    <Tip :label="label">
      <PopoverTrigger
        :class="styles.trigger()"
        :aria-label="label"
        :data-slot="scope === 'chat' ? 'chat-usage-total' : 'chat-turn-usage'"
        data-test-id="chat-usage-meter"
      >
        <icon-lucide-coins :class="styles.icon()" aria-hidden="true" />
        <span aria-hidden="true">{{ tokens }}</span>
        <span v-if="cost" :class="styles.cost()" aria-hidden="true">{{ cost }}</span>
      </PopoverTrigger>
    </Tip>
    <PopoverPortal>
      <PopoverContent
        align="end"
        :side-offset="6"
        :class="styles.content()"
        :aria-label="messages.usageLabel"
        data-test-id="chat-usage-meter-details"
      >
        <p :class="styles.heading()">{{ messages.usageLabel }}</p>
        <p :class="styles.figure()">{{ label }}</p>
        <dl :class="styles.rows()">
          <div v-for="row in rows" :key="row.label" :class="styles.row()">
            <dt :class="styles.rowLabel()">{{ row.label }}</dt>
            <dd :class="styles.rowValue()">{{ formatTokens(row.value) }}</dd>
          </div>
          <div v-if="cost" :class="styles.row()">
            <dt :class="styles.rowLabel()">{{ messages.usageCost }}</dt>
            <dd :class="styles.rowValue()">{{ cost }}</dd>
          </div>
        </dl>
        <p :class="styles.note()">
          {{ cost === null ? messages.usageNoCost : messages.usageHint }}
        </p>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
