<script setup lang="ts">
import { promiseTimeout } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'

import { ACP_AGENTS, AI_PROVIDERS, IS_TAURI, type AIProviderID } from '@pairdraw/core/constants'
import { useAIMessages } from '@pairdraw/vue/i18n'

import { modelProviderName } from '@/app/ai/models/provider-name'
import { PAIRDRAW_AI_PROVIDER } from '@/app/ai/providers/pairdraw/provider'
import { automationHTTPURL } from '@/app/automation/mcp/spawn'
import { cloudAIAvailable } from '@/app/cloud/integration'
import ProviderLogo from '@/components/settings/provider/ProviderLogo.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import type { AppSelectGroup } from '@/components/ui/select/select'

const ai = useAIMessages()
const mcpAvailable = ref(false)

async function checkMCPHealth(retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${automationHTTPURL()}/health`, {
        signal: AbortSignal.timeout(2000)
      })
      if (res.ok) {
        mcpAvailable.value = true
        return
      }
    } catch (e) {
      console.error(
        '[MCP] health check failed (attempt',
        i + 1,
        '):',
        e instanceof Error ? e.message : e
      )
      if (i < retries - 1) await promiseTimeout(delayMs)
    }
  }
}

interface ProviderSelectProps {
  allowAgents?: boolean
  ui?: {
    trigger?: string
    content?: string
    item?: string
    label?: string
    separator?: string
  }
}

const { allowAgents = true, ui } = defineProps<ProviderSelectProps>()

if (IS_TAURI) {
  onMounted(() => {
    void checkMCPHealth()
  })
}

const acpAgents = computed(() => (allowAgents && IS_TAURI && mcpAvailable.value ? ACP_AGENTS : []))

const providerID = defineModel<AIProviderID>({ required: true })
const providerDef = computed(
  () => AI_PROVIDERS.find((provider) => provider.id === providerID.value) ?? AI_PROVIDERS[0]
)

const displayName = computed(() => {
  if (providerID.value === 'harness:pi') return 'Pi'
  if (providerID.value.startsWith('acp:')) {
    const agentId = providerID.value.replace('acp:', '')
    return ACP_AGENTS.find((agent) => agent.id === agentId)?.name ?? providerID.value
  }
  return modelProviderName(providerDef.value.id)
})

const groups = computed(() => {
  const result: AppSelectGroup<string>[] = []

  if (acpAgents.value.length) {
    result.push({
      label: ai.value.providerGroupAgents,
      options: acpAgents.value.map((agent) => ({
        value: `acp:${agent.id}`,
        label: agent.name
      }))
    })
  }

  result.push({
    label: acpAgents.value.length ? ai.value.providerGroupProviders : undefined,
    options: AI_PROVIDERS.filter(
      (provider) =>
        // Signing in returns to a port on this computer, which only the desktop app can open.
        (IS_TAURI || !provider.signInOnly) &&
        // Cloud's AI service is offered while the Home server has one, and kept when chosen.
        (provider.id !== PAIRDRAW_AI_PROVIDER ||
          cloudAIAvailable.value ||
          providerID.value === PAIRDRAW_AI_PROVIDER)
    )
      .map((provider) => ({
        value: provider.id,
        label: modelProviderName(provider.id)
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  })

  return result
})
</script>

<template>
  <AppSelect v-model="providerID" :groups="groups" :placeholder="displayName" :ui="ui">
    <template #leading><ProviderLogo :provider="providerID" class="mr-2 size-3.5" /></template>
    <template #option="{ option }">
      <span class="flex min-w-0 items-center gap-2">
        <ProviderLogo :provider="option.value" class="size-3.5" />
        <span class="truncate">{{ option.label }}</span>
      </span>
    </template>
  </AppSelect>
</template>
