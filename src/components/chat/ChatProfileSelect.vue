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

import { AI_PROVIDERS, type ACPAgentDef } from '@pairdraw/core/constants'
import { useI18n } from '@pairdraw/vue/i18n'

import { connectsWithoutClick } from '@/app/ai/agents/auto/pick'
import { agentAutoConnect } from '@/app/ai/agents/auto/session'
import {
  providerBackend,
  switchContextLoss,
  type ChatModelChoice,
  type ContextLoss
} from '@/app/ai/chat/history/backend'
import { isConfigured } from '@/app/ai/chat/storage'
import { useAIChat } from '@/app/ai/chat/use'
import {
  aiModelSettings,
  designModelProfile,
  designModelProfiles,
  modelConnection,
  setModelRoleAssignment
} from '@/app/ai/models'
import type { AIModelProfile, AIModelProfileId } from '@/app/ai/models'
import { profileLogoSource } from '@/app/ai/models/provider-logo'
import { modelProviderName } from '@/app/ai/models/provider-name'
import { openSettingsDialog } from '@/app/settings/dialog'
import { toast } from '@/app/shell/ui'
import ChatProfileItem from '@/components/chat/ChatProfileItem.vue'
import ProviderLogo from '@/components/settings/provider/ProviderLogo.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppConfirmationDialog from '@/components/ui/dialog/AppConfirmationDialog.vue'
import { useHeldContent } from '@/components/ui/overlay/held'
import { useSelectUI } from '@/components/ui/select/select'

import { chatProfileTheme } from './ui'

const { ai, common } = useI18n()
const { history } = useAIChat()
const open = ref(false)
const profiles = computed(designModelProfiles)
/** The trigger wears the logo of the model the chat runs on, as its menu row does. */
const currentLogo = computed(() =>
  designModelProfile.value ? profileLogoSource(designModelProfile.value) : null
)
const ui = chatProfileTheme()
const selectCls = useSelectUI({
  trigger: ui.trigger(),
  content: ui.content(),
  viewport: ui.viewport(),
  item: ui.item(),
  contentVariants: { padding: 'none' }
})

/** A switch that waits for the person to accept losing part of the conversation's context. */
type PendingSwitch = { loss: Exclude<ContextLoss, 'none'> } & (
  | { kind: 'profile'; id: AIModelProfileId; name: string }
  | { kind: 'agent'; agent: ACPAgentDef }
)
const pendingSwitch = ref<PendingSwitch | null>(null)
const pendingShown = useHeldContent(pendingSwitch)
const pendingName = computed(() => {
  const pending = pendingShown.value
  if (!pending) return ''
  return pending.kind === 'profile' ? pending.name : pending.agent.name
})
const pendingDescription = computed(() => {
  const params = { name: pendingName.value }
  return pendingShown.value?.loss === 'agentSession'
    ? ai.value.switchProfileAgentSessionDescription(params)
    : ai.value.switchProfileDescription(params)
})

function profileChoice(profile: AIModelProfile): ChatModelChoice {
  const providerID = modelConnection(profile.connectionId)?.providerID
  return { id: profile.id, backend: providerID ? providerBackend(providerID) : 'direct' }
}

/** What of the open conversation's context switching to `to` would leave behind. */
function contextLoss(to: ChatModelChoice): ContextLoss {
  const current = designModelProfile.value
  const hasMessages =
    history.messages.value.length > 0 || (history.current.value?.messages.length ?? 0) > 0
  return switchContextLoss(hasMessages, current ? profileChoice(current) : null, to)
}

const selectedProfileId = computed({
  get: () => aiModelSettings.value.assignments.design,
  set: (profileId: AIModelProfileId) => {
    const profile = profiles.value.find((candidate) => candidate.id === profileId)
    const loss = profile ? contextLoss(profileChoice(profile)) : 'none'
    if (profile && loss !== 'none') {
      pendingSwitch.value = { loss, kind: 'profile', id: profile.id, name: profile.name }
      return
    }
    setModelRoleAssignment('design', profileId)
  }
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
  const loss = contextLoss({ id: `agent:${agent.id}`, backend: 'acp' })
  if (loss !== 'none') {
    pendingSwitch.value = { loss, kind: 'agent', agent }
    return
  }
  await switchToAgent(agent)
}

async function switchToAgent(agent: ACPAgentDef) {
  const result = await agentAutoConnect.switchTo(agent.id)
  // Without a model, the chat column shows what stopped it; otherwise say so here.
  if (result === 'failed' && isConfigured.value) {
    toast.error(ai.value.aiSetupConnectActivateFailed({ agent: agent.name }))
  }
}

/** The person accepted losing the context: the switch goes ahead. */
function confirmSwitch() {
  const pending = pendingSwitch.value
  pendingSwitch.value = null
  if (!pending) return
  if (pending.kind === 'profile') setModelRoleAssignment('design', pending.id)
  else void switchToAgent(pending.agent)
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
      <ProviderLogo v-if="currentLogo" v-bind="currentLogo" :class="ui.triggerIcon()" />
      <icon-lucide-bot v-else :class="ui.triggerIcon()" />
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
                <ProviderLogo :provider="`acp:${agent.id}`" />
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
  <AppConfirmationDialog
    :open="pendingSwitch !== null"
    tone="warning"
    :heading="ai.switchProfileHeading({ name: pendingName })"
    :description="pendingDescription"
    :cancel-label="common.cancel"
    :confirm-label="ai.switchProfileConfirm"
    @update:open="(isOpen) => !isOpen && (pendingSwitch = null)"
    @confirm="confirmSwitch"
  />
</template>
