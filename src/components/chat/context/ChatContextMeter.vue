<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useChatContextMessages } from '@open-pencil/vue/i18n'

import {
  formatContextShare,
  formatTokens,
  type ContextMeter
} from '@/app/ai/chat/context-window/meter'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppProgress from '@/components/ui/feedback/AppProgress.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import meterTheme from '@/theme/chat/context-meter'

/**
 * How full the conversation keeps the model's context window, in tokens only: a small bar in the
 * chat header that opens the latest reply's breakdown.
 */
const { meter } = defineProps<{ meter: ContextMeter }>()

const meterStyles = tv(meterTheme)
const messages = useChatContextMessages()
const styles = computed(() => meterStyles({ level: meter.level }))

const share = computed(() => (meter.fraction === null ? null : formatContextShare(meter.fraction)))
const label = computed(() =>
  share.value === null
    ? messages.value.contextMeterTokensLabel({ used: formatTokens(meter.usedTokens) })
    : messages.value.contextMeterLabel({ share: share.value })
)
const figure = computed(() => {
  const used = formatTokens(meter.usedTokens)
  if (meter.windowTokens === null) return messages.value.contextUsageTokens({ used })
  const size = formatTokens(meter.windowTokens)
  return share.value === null
    ? messages.value.contextUsage({ used, window: size })
    : messages.value.contextUsageShare({ used, window: size, share: share.value })
})
const rows = computed(() => {
  const list: { label: string; value: number }[] = []
  if (meter.inputTokens !== null)
    list.push({ label: messages.value.contextInput, value: meter.inputTokens })
  if (meter.cachedInputTokens)
    list.push({ label: messages.value.contextCachedInput, value: meter.cachedInputTokens })
  if (meter.outputTokens !== null)
    list.push({ label: messages.value.contextOutput, value: meter.outputTokens })
  if (meter.pinnedTokens > 0)
    list.push({ label: messages.value.contextPinned, value: meter.pinnedTokens })
  return list
})
</script>

<template>
  <PopoverRoot>
    <Tip :label="label">
      <PopoverTrigger
        :class="styles.trigger()"
        :aria-label="label"
        :data-level="meter.level"
        data-test-id="chat-context-meter"
      >
        <AppProgress
          v-if="meter.windowTokens !== null"
          aria-hidden="true"
          :amount="{ value: meter.usedTokens, max: meter.windowTokens }"
          :ui="{ root: styles.bar(), fill: styles.fill() }"
        />
        <icon-lucide-gauge v-else :class="styles.icon()" aria-hidden="true" />
        <span aria-hidden="true">{{ share ?? formatTokens(meter.usedTokens) }}</span>
      </PopoverTrigger>
    </Tip>
    <PopoverPortal>
      <PopoverContent
        align="end"
        :side-offset="6"
        :class="styles.content()"
        :aria-label="messages.contextWindow"
        data-test-id="chat-context-meter-details"
      >
        <p :class="styles.heading()">{{ messages.contextWindow }}</p>
        <p :class="styles.figure()">
          {{ figure }}
        </p>
        <AppProgress
          v-if="meter.windowTokens !== null"
          :amount="{ value: meter.usedTokens, max: meter.windowTokens }"
          :aria-label="label"
          :class="styles.progress()"
          :ui="{ fill: styles.fill() }"
        />
        <p :class="styles.note()">
          <template v-if="!meter.measured">{{ messages.contextNotMeasured }}</template>
          <template v-else>{{ messages.contextMeterHint }}</template>
          {{ ' ' }}
          <template v-if="meter.windowTokens === null">{{
            messages.contextWindowUnknown
          }}</template>
          <template v-else-if="!meter.measured">{{
            messages.contextWindowSize({ window: formatTokens(meter.windowTokens) })
          }}</template>
        </p>
        <dl v-if="rows.length" :class="styles.rows()">
          <div v-for="row in rows" :key="row.label" :class="styles.row()">
            <dt :class="styles.rowLabel()">{{ row.label }}</dt>
            <dd :class="styles.rowValue()">{{ formatTokens(row.value) }}</dd>
          </div>
        </dl>
        <AppAlert
          v-if="meter.level === 'full'"
          tone="warning"
          :heading="messages.contextNearlyFull"
          :ui="{ root: styles.alert() }"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
