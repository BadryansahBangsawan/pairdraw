<script setup lang="ts">
import type { UIMessage } from 'ai'
import { computed, toRef } from 'vue'

import { useChatUsage } from '@/app/ai/chat/usage/use'

import ChatUsageMeter from './ChatUsageMeter.vue'

/**
 * The chat header's running token total and estimated cost for the open conversation, shown only
 * while the setting is on and a reply has reported usage.
 */
const { messages } = defineProps<{ messages: readonly UIMessage[] }>()

const usage = useChatUsage(toRef(() => messages))
const total = computed(() => usage.total)
</script>

<template>
  <ChatUsageMeter
    v-if="usage.visible && total"
    :usage="total"
    :cost-usd="usage.costUsd"
    scope="chat"
  />
</template>
