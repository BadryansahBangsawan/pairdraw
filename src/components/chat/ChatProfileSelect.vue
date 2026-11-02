<script setup lang="ts">
import { compact } from 'es-toolkit/array'
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectPortal,
  SelectRoot,
  SelectSeparator,
  SelectTrigger,
  SelectViewport,
  type AcceptableValue,
  type SelectItemSelectEvent
} from 'reka-ui'
import { computed, ref } from 'vue'

import { AI_PROVIDERS, type ACPAgentDef } from '@open-pencil/core/constants'
import { useI18n } from '@open-pencil/vue/i18n'

import { connectsWithoutClick } from '@/app/ai/agents/auto/pick'
import { agentAutoConnect } from '@/app/ai/agents/auto/session'
import { isConfigured } from '@/app/ai/chat/storage'
import {
  aiModelSettings,
  designModelProfiles,
  modelConnection,
  setModelRoleAssignment
} from '@/app/ai/models'
import type { AIModelProfile, AIModelProfileId } from '@/app/ai/models'
import { modelProviderName } from '@/app/ai/models/provider-name'
import { openSettingsDialog } from '@/app/settings/dialog'
import { toast } from '@/app/shell/ui'
import ChatProfileItem from '@/components/chat/ChatProfileItem.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { useSelectUI } from '@/components/ui/select/select'

import { chatProfileTheme } from './ui'

const { ai } = useI18n()
const open = ref(false)
const profiles = computed(designModelProfiles)
const ui = chatProfileTheme()
const selectCls = useSelectUI({
  trigger: ui.trigger(),
  content: ui.content(),
  viewport: ui.viewport(),
  item: ui.item(),
  contentVariants: { padding: 'none' }
})

const selectedProfileId = computed({
  get: () => aiModelSettings.value.assignments.design,
  set: (profileId: AIModelProfileId) => setModelRoleAssignment('design', profileId)
})

function profileMetadata(profile: AIModelProfile): string {
  const connection = modelConnection(profile.connectionId)
  const provider = AI_PROVIDERS.find((candidate) => candidate.id === connection?.providerID)
  const modelID = profile.customModelID || profile.modelID
  const modelName = provider?.models.find((model) => model.id === modelID)?.name || modelID
  return compact([modelName, connection && modelProviderName(connection.providerID)]).join(' · ')
}

function manageModels(): void {
  open.value = false
  openSettingsDialog('ai')
}

/**
 * Coding agents found on this computer that need nothing more and have no model yet; choosing
 * one switches the chat to it, as auto-connect would have.
 */
const computerAgents = computed(() =>
  agentAutoConnect.state.candidates
    .filter(connectsWithoutClick)
    .map((candidate) => candidate.agent)
    .filter(
      (agent) =>
        !profiles.value.some(
          (profile) => modelConnection(profile.connectionId)?.providerID === `acp:${agent.id}`
        )
    )
)

async function chooseAgent(event: SelectItemSelectEvent<AcceptableValue>, agent: ACPAgentDef) {
  // The agent has no profile to select yet; switching to it makes one.
  event.preventDefault()
  open.value = false
  const result = await agentAutoConnect.switchTo(agent.id)
  // Without a model, the chat column shows what stopped it; otherwise say so here.
  if (result === 'failed' && isConfigured.value) {
    toast.error(ai.value.aiSetupConnectActivateFailed({ agent: agent.name }))
  }
}

defineExpose({
  /** Opens the list, such as from the notice naming the agent the chat switched to. */
  show: () => {
    open.value = true
  }
})
</script>

<template>
  <SelectRoot v-model="selectedProfileId" v-model:open="open">
    <SelectTrigger
      data-test-id="chat-profile-selector"
      :aria-label="ai.selectDesignModel"
      :class="selectCls.trigger"
    >
      <icon-lucide-bot :class="ui.triggerIcon()" />
      <span :class="ui.triggerValue()"><slot name="value" /></span>
      <icon-lucide-chevron-down :class="ui.triggerChevron()" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        side="top"
        align="start"
        :side-offset="4"
        :collision-padding="8"
        :class="selectCls.content"
      >
        <SelectViewport :class="selectCls.viewport">
          <SelectGroup>
            <div :class="ui.header()">
              <SelectLabel :class="ui.headerLabel()">{{ ai.modelRoleDesign }}</SelectLabel>
              <p :class="ui.headerDescription()">{{ ai.modelRoleDesignDescription }}</p>
            </div>
            <SelectItem
              v-for="profile in profiles"
              :key="profile.id"
              :value="profile.id"
              :text-value="`${profile.name} ${profileMetadata(profile)}`"
              :class="selectCls.item"
            >
              <SelectItemIndicator :class="ui.indicator()">
                <icon-lucide-check :class="ui.indicatorIcon()" />
              </SelectItemIndicator>
              <span v-if="profile.id !== selectedProfileId" :class="ui.indicator()" />
              <SelectItemText as-child>
                <ChatProfileItem :profile="profile" :metadata="profileMetadata(profile)" />
              </SelectItemText>
            </SelectItem>
          </SelectGroup>
          <template v-if="computerAgents.length">
            <SelectSeparator :class="selectCls.separator" />
            <SelectGroup>
              <div :class="ui.header()">
                <SelectLabel :class="ui.headerLabel()">{{
                  ai.chatAgentOnThisComputer
                }}</SelectLabel>
              </div>
              <SelectItem
                v-for="agent in computerAgents"
                :key="agent.id"
                :value="`agent:${agent.id}`"
                :text-value="agent.name"
                :class="selectCls.item"
                @select="void chooseAgent($event, agent)"
              >
                <span :class="ui.indicator()" />
                <SelectItemText as-child>
                  <span :class="ui.text()">
                    <span :class="ui.name()">{{ agent.name }}</span>
                    <span :class="ui.metadata()">{{ ai.aiSetupAgentModel }}</span>
                  </span>
                </SelectItemText>
                <span :class="ui.capability()" />
              </SelectItem>
            </SelectGroup>
          </template>
          <AppButton class="w-full justify-start" @click="manageModels">
            <template #leading><icon-lucide-settings :class="ui.footerIcon()" /></template>
            {{ ai.manageModelsAndRoles }}
          </AppButton>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
