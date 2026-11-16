<script setup lang="ts">
import { tv } from 'tailwind-variants'
import type { Component } from 'vue'
import { computed } from 'vue'
import IconBedrock from '~icons/ai/bedrock-color'
import IconClaude from '~icons/ai/claude-color'
import IconClaudeCode from '~icons/ai/claudecode-color'
import IconCodex from '~icons/ai/codex-color'
import IconDeepSeek from '~icons/ai/deepseek-color'
import IconFireworks from '~icons/ai/fireworks-color'
import IconGemini from '~icons/ai/gemini-color'
import IconGeminiCLI from '~icons/ai/geminicli-color'
import IconKimi from '~icons/ai/kimi'
import IconLMStudio from '~icons/ai/lmstudio'
import IconMeta from '~icons/ai/meta-color'
import IconMiniMax from '~icons/ai/minimax-color'
import IconMistral from '~icons/ai/mistral-color'
import IconMoonshot from '~icons/ai/moonshot'
import IconOllama from '~icons/ai/ollama'
import IconOmp from '~icons/ai/omp-color'
import IconOpenAI from '~icons/ai/openai'
import IconOpenCode from '~icons/ai/opencode'
import IconOpenRouter from '~icons/ai/openrouter'
import IconPi from '~icons/ai/pi'
import IconQwen from '~icons/ai/qwen-color'
import IconTogether from '~icons/ai/together-color'
import IconVertexAI from '~icons/ai/vertexai-color'
import IconXAI from '~icons/ai/xai'
import IconZai from '~icons/ai/zai'
import IconServer from '~icons/lucide/server'

import { providerLogo, type ProviderLogoID } from '@/app/ai/models/provider-logo'
import BrandMark from '@/components/brand/BrandMark.vue'
import providerLogoTheme from '@/theme/settings/provider-logo'

const {
  provider,
  model,
  class: className
} = defineProps<{
  /** A provider, coding agent, or server preset such as `ollama`. */
  provider: string
  /** The model a profile runs: a router such as OpenRouter then shows the model's maker. */
  model?: string
  class?: string
}>()

const styles = tv(providerLogoTheme)

/**
 * The brand's colour mark where LobeHub has one that reads on both themes, otherwise its
 * monochrome mark, which draws in the text color. omp's mark is its own artwork (`assets/ai-logos`),
 * with the bars in the text color so it reads on both themes. Anthropic shows Claude's mark: its own has no
 * colour version. OpenRouter's lime and Kimi's white letter vanish on a light panel, so they stay
 * monochrome.
 */
const ICONS: Record<Exclude<ProviderLogoID, 'pairdraw'>, Component> = {
  anthropic: IconClaude,
  openai: IconOpenAI,
  google: IconGemini,
  openrouter: IconOpenRouter,
  deepseek: IconDeepSeek,
  zai: IconZai,
  minimax: IconMiniMax,
  xai: IconXAI,
  meta: IconMeta,
  kimi: IconKimi,
  moonshot: IconMoonshot,
  mistral: IconMistral,
  qwen: IconQwen,
  together: IconTogether,
  fireworks: IconFireworks,
  opencode: IconOpenCode,
  'amazon-bedrock': IconBedrock,
  'google-vertex': IconVertexAI,
  ollama: IconOllama,
  lmstudio: IconLMStudio,
  'claude-code': IconClaudeCode,
  codex: IconCodex,
  'gemini-cli': IconGeminiCLI,
  omp: IconOmp,
  pi: IconPi
}

const logo = computed(() => providerLogo(provider, model))
const icon = computed(() => {
  const id = logo.value
  if (id === 'pairdraw') return null
  return id ? ICONS[id] : IconServer
})
</script>

<template>
  <component
    :is="icon"
    v-if="icon"
    :class="styles({ class: className })"
    :data-logo="logo ?? 'server'"
    aria-hidden="true"
    data-slot="provider-logo"
  />
  <BrandMark
    v-else
    variant="app-icon"
    decorative
    :class="styles({ class: className })"
    data-logo="pairdraw"
    data-slot="provider-logo"
  />
</template>
