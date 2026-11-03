<script setup lang="ts">
import { computed } from 'vue'

import { IS_TAURI, type AIProviderID } from '@open-pencil/core/constants'
import { useAIMessages, useSettingsMessages } from '@open-pencil/vue/i18n'

import { aiModelSettings, modelConnection } from '@/app/ai/models'
import { modelProviderName } from '@/app/ai/models/provider-name'
import {
  ONBOARDING_AGENTS,
  ONBOARDING_API_PROVIDERS,
  ONBOARDING_MORE_API_PROVIDERS,
  ONBOARDING_SERVER_PROVIDER,
  ONBOARDING_SUBSCRIPTIONS,
  needsDesktop
} from '@/app/ai/models/settings/onboarding/plan'
import { OPENPENCIL_AI_PROVIDER } from '@/app/ai/providers/openpencil/provider'
import { cloudAIAvailable } from '@/app/cloud/integration'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import ProviderLogo from '@/components/settings/provider/ProviderLogo.vue'
import AppBadge from '@/components/ui/feedback/AppBadge.vue'
import AppActionRow from '@/components/ui/list/AppActionRow.vue'

/**
 * What a new model runs on, chosen before its form, in guided setup's groups: coding agents,
 * subscriptions on the desktop, API accounts, servers, and Cloud's models while it offers them.
 */
const emit = defineEmits<{ choose: [providerID: AIProviderID] }>()
const ai = useAIMessages()
const settings = useSettingsMessages()

/** Providers a model in the list already runs on; choosing one again adds another model. */
const setUp = computed(
  () =>
    new Set(
      aiModelSettings.value.models.flatMap(
        (model) => modelConnection(model.connectionId)?.providerID ?? []
      )
    )
)

interface Choice {
  id: AIProviderID
  description?: string
}

const groups = computed(() => {
  const groups: { key: string; title: string; description?: string; choices: Choice[] }[] = []
  // Agents run on this computer: in the desktop app, or through the web app's companion, whose
  // setup the agent's form shows. Pi and subscription sign-ins need the desktop app itself.
  groups.push({
    key: 'agents',
    title: ai.value.aiSetupAccessAgents,
    description: ai.value.aiSetupAccessAgentsDescription,
    choices: ONBOARDING_AGENTS.filter((id) => IS_TAURI || !needsDesktop(id)).map((id) => ({ id }))
  })
  if (IS_TAURI) {
    groups.push({
      key: 'subscriptions',
      title: ai.value.aiSetupAccessSubscriptions,
      choices: ONBOARDING_SUBSCRIPTIONS.map((id) => ({
        id,
        description: ai.value.aiSetupAccessChatGPT
      }))
    })
  }
  groups.push(
    {
      key: 'api',
      title: ai.value.aiSetupAccessAPI,
      // Some API endpoints send no CORS headers, so only the desktop app can reach them.
      choices: [...ONBOARDING_API_PROVIDERS, ...ONBOARDING_MORE_API_PROVIDERS]
        .filter((id) => IS_TAURI || !needsDesktop(id))
        .map((id) => ({ id }))
    },
    {
      // Claude and Gemini billed to the person's own AWS or Google Cloud account.
      key: 'cloud-platforms',
      title: settings.value.cloudPlatforms,
      description: settings.value.cloudPlatformsDescription,
      choices: [{ id: 'amazon-bedrock' }, { id: 'google-vertex' }]
    },
    {
      key: 'servers',
      title: ai.value.aiSetupAccessServer,
      choices: [
        { id: ONBOARDING_SERVER_PROVIDER, description: ai.value.aiSetupAccessServerDescription },
        { id: 'anthropic-compatible' }
      ]
    }
  )
  if (cloudAIAvailable.value) {
    groups.push({
      key: 'cloud',
      title: modelProviderName(OPENPENCIL_AI_PROVIDER),
      choices: [{ id: OPENPENCIL_AI_PROVIDER }]
    })
  }
  return groups
})
</script>

<template>
  <div class="flex flex-col gap-6" data-test-id="settings-model-provider-chooser">
    <SettingsSection v-for="group in groups" :key="group.key">
      <template #title>{{ group.title }}</template>
      <template v-if="group.description" #description>{{ group.description }}</template>
      <div class="flex flex-col gap-1.5">
        <AppActionRow
          v-for="choice in group.choices"
          :key="choice.id"
          :data-provider="choice.id"
          :data-set-up="setUp.has(choice.id) || undefined"
          @click="emit('choose', choice.id)"
        >
          <template #leading><ProviderLogo :provider="choice.id" /></template>
          {{ modelProviderName(choice.id) }}
          <template v-if="choice.description" #description>{{ choice.description }}</template>
          <template #trailing>
            <AppBadge v-if="setUp.has(choice.id)" :ui="{ base: 'bg-hover text-surface' }">{{
              ai.modelProviderSetUp
            }}</AppBadge>
            <icon-lucide-chevron-right class="size-3.5" />
          </template>
        </AppActionRow>
      </div>
    </SettingsSection>
  </div>
</template>
