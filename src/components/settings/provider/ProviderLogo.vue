<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import IconAnthropic from '~icons/ai/anthropic'
import IconBedrock from '~icons/ai/bedrock'
import IconClaudeCode from '~icons/ai/claudecode'
import IconCodex from '~icons/ai/codex'
import IconDeepSeek from '~icons/ai/deepseek'
import IconFireworks from '~icons/ai/fireworks'
import IconGemini from '~icons/ai/gemini'
import IconGeminiCLI from '~icons/ai/geminicli'
import IconKimi from '~icons/ai/kimi'
import IconLMStudio from '~icons/ai/lmstudio'
import IconMeta from '~icons/ai/meta'
import IconMiniMax from '~icons/ai/minimax'
import IconMoonshot from '~icons/ai/moonshot'
import IconOllama from '~icons/ai/ollama'
import IconOpenAI from '~icons/ai/openai'
import IconOpenCode from '~icons/ai/opencode'
import IconOpenRouter from '~icons/ai/openrouter'
import IconTogether from '~icons/ai/together'
import IconVertexAI from '~icons/ai/vertexai'
import IconXAI from '~icons/ai/xai'
import IconZai from '~icons/ai/zai'
import IconBot from '~icons/lucide/bot'
import IconServer from '~icons/lucide/server'

/** A provider, agent, or server preset such as `ollama`. */
const { provider } = defineProps<{ provider: string }>()

const LOGOS: Record<string, Component> = {
  anthropic: IconAnthropic,
  openai: IconOpenAI,
  chatgpt: IconOpenAI,
  google: IconGemini,
  openrouter: IconOpenRouter,
  deepseek: IconDeepSeek,
  zai: IconZai,
  minimax: IconMiniMax,
  xai: IconXAI,
  meta: IconMeta,
  'kimi-for-coding': IconKimi,
  moonshot: IconMoonshot,
  together: IconTogether,
  fireworks: IconFireworks,
  'opencode-zen': IconOpenCode,
  'opencode-go': IconOpenCode,
  'amazon-bedrock': IconBedrock,
  'google-vertex': IconVertexAI,
  ollama: IconOllama,
  lmstudio: IconLMStudio,
  'acp:claude-code': IconClaudeCode,
  'acp:codex': IconCodex,
  'acp:gemini-cli': IconGeminiCLI,
  'harness:pi': IconBot
}

const logo = computed(() => LOGOS[provider] ?? IconServer)
</script>

<template>
  <component :is="logo" class="size-4 shrink-0" aria-hidden="true" data-slot="provider-logo" />
</template>
