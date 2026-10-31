<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { IS_TAURI, type ACPAgentDef } from '@open-pencil/core/constants'
import { useI18n } from '@open-pencil/vue/i18n'

import type { AgentConnectStep } from '@/app/ai/agents/setup/connect'
import { codingAgentGuideURL, codingAgentSetupPrompt } from '@/app/ai/agents/setup/prompt'
import { agentConnectView, agentSetupView, type AgentSetupState } from '@/app/ai/agents/setup/view'
import SettingsLink from '@/components/settings/layout/SettingsLink.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppCopyField from '@/components/ui/input/AppCopyField.vue'
import { NODE_DOWNLOAD_URL } from '@/constants'
import theme from '@/theme/settings/agents'

import AgentSetupCompanion from './AgentSetupCompanion.vue'
import AgentSetupStep from './AgentSetupStep.vue'
import AgentSignInProgress from './AgentSignInProgress.vue'
import { useSetupProblemMessage } from './problem'

const { agent, setup } = defineProps<{ agent: ACPAgentDef; setup: AgentSetupState }>()
const emit = defineEmits<{
  connect: []
  cancelSignIn: []
  submitSignInCode: [code: string]
}>()
const { ai, common } = useI18n()
const styles = tv(theme)()
const setupProblemMessage = useSetupProblemMessage()
const { copy, copied } = useClipboard({ copiedDuring: 1500 })

const prompt = computed(() => codingAgentSetupPrompt(agent.id))
const view = computed(() => agentSetupView(agent, setup))
const progress = computed(() => agentConnectView(agent, setup))
const failure = computed(() => progress.value.failure)
const account = computed(() => view.value.account)
/** The plan and email a signed-in agent reports. */
const accountDetail = computed(() => {
  const current = account.value
  if (current?.state !== 'signed-in') return ''
  return [current.label, current.detail].filter((part) => part !== null).join(' · ')
})
const installProblem = computed(() => setupProblemMessage(progress.value.problem))
const connectLabel = computed(() => {
  if (progress.value.running) return ai.value.aiSetupConnecting
  if (failure.value) return ai.value.retryRequest
  if (progress.value.connected) return ai.value.aiSetupAgentCheckAgain
  return ai.value.aiSetupConnect({ agent: agent.name })
})

function stepLabel(step: AgentConnectStep): string {
  if (step === 'detect') return ai.value.aiSetupConnectStepDetect
  if (step === 'install') return ai.value.aiSetupConnectStepInstall({ agent: agent.name })
  if (step === 'sign-in') return ai.value.aiSetupConnectStepSignIn({ agent: agent.name })
  if (step === 'tools') return ai.value.aiSetupConnectStepTools
  return ai.value.aiSetupConnectStepActivate
}
</script>

<template>
  <p :class="styles.help()">
    {{ ai.aiSetupAgentDescription({ agent: agent.name }) }}
    <SettingsLink :href="codingAgentGuideURL(agent.id)">{{ common.learnMore }}</SettingsLink>
  </p>
  <AgentSetupCompanion v-if="!IS_TAURI" />

  <template v-if="setup.supported">
    <ol :class="styles.list()" :aria-label="ai.aiSetupConnect({ agent: agent.name })">
      <AgentSetupStep v-for="{ step, status } in progress.steps" :key="step" :status="status">
        {{ stepLabel(step) }}
        <span v-if="step === 'sign-in' && accountDetail" :class="styles.detail()">
          · {{ accountDetail }}
        </span>
      </AgentSetupStep>
    </ol>
    <p v-if="view.canInstallAdapter && agent.installCommand && !failure" :class="styles.help()">
      {{ ai.aiSetupAgentInstallRuns({ command: agent.installCommand }) }}
    </p>

    <template v-if="account?.state === 'signing-in'">
      <AgentSignInProgress :account="account" @submit-code="emit('submitSignInCode', $event)" />
      <div :class="styles.actions()">
        <AppButton size="xs" variant="outline" @click="emit('cancelSignIn')">
          {{ common.cancel }}
        </AppButton>
      </div>
    </template>

    <template v-if="progress.signInCommand && setup.detected?.status === 'available'">
      <p :class="styles.help()">{{ ai.aiSetupConnectSignInCommand }}</p>
      <AppCopyField
        :value="progress.signInCommand"
        :copy-label="common.copy"
        :copied-label="common.copied"
      />
    </template>

    <template v-if="failure">
      <AppAlert v-if="installProblem" tone="warning" :heading="installProblem">
        <template v-if="progress.problem === 'needs-npm'" #actions>
          <SettingsLink :href="NODE_DOWNLOAD_URL">Node.js</SettingsLink>
        </template>
      </AppAlert>
      <AppAlert
        v-else-if="failure.problem === 'cli-missing'"
        tone="warning"
        :heading="ai.aiSetupConnectCLIMissing({ agent: agent.name })"
      >
        <template v-if="agent.setupURL" #actions>
          <SettingsLink :href="agent.setupURL">
            {{ ai.aiSetupAgentGetCLI({ agent: agent.name }) }}
          </SettingsLink>
        </template>
      </AppAlert>
      <AppAlert
        v-else-if="failure.problem === 'adapter-mismatch'"
        tone="warning"
        :heading="
          ai.aiSetupAgentAdapterMismatch({
            path: setup.detected?.adapterPath ?? agent.command
          })
        "
      />
      <AppAlert
        v-else-if="failure.problem === 'check'"
        tone="warning"
        :heading="ai.aiSetupConnectCheckFailed({ agent: agent.name })"
      />
      <AppAlert
        v-else-if="failure.problem === 'sign-in'"
        tone="warning"
        :heading="ai.aiSetupAgentSignInFailed({ agent: agent.name })"
      />
      <AppAlert
        v-else-if="failure.problem === 'signed-out'"
        tone="warning"
        :heading="ai.aiSetupConnectSignedOut({ agent: agent.name })"
      />
      <AppAlert
        v-else-if="failure.problem === 'tools'"
        tone="warning"
        :heading="ai.aiSetupAgentToolsFailed({ agent: agent.name })"
        :description="account?.tools?.reason ?? ai.aiSetupAgentToolsHint"
      />
      <AppAlert
        v-else-if="failure.problem === 'activate'"
        tone="warning"
        :heading="ai.aiSetupConnectActivateFailed({ agent: agent.name })"
      />

      <template v-if="failure.step === 'install' || failure.problem === 'adapter-mismatch'">
        <template v-if="view.manualAgentCommand">
          <p :class="styles.help()">
            {{ view.adapterMismatch ? ai.aiSetupAgentInstallSupported : ai.aiSetupAgentInstall }}
          </p>
          <AppCopyField
            :value="view.manualAgentCommand"
            :copy-label="common.copy"
            :copied-label="common.copied"
          />
        </template>
        <template v-if="view.manualBridgeCommand">
          <p :class="styles.help()">{{ ai.aiSetupAgentMCPInstall }}</p>
          <AppCopyField
            :value="view.manualBridgeCommand"
            :copy-label="common.copy"
            :copied-label="common.copied"
          />
        </template>
      </template>
    </template>

    <div :class="styles.actions()">
      <AppButton
        size="xs"
        :color="progress.connected ? 'neutral' : 'primary'"
        :variant="progress.connected ? 'outline' : 'solid'"
        :loading="progress.running"
        :disabled="progress.running || view.busy"
        @click="emit('connect')"
      >
        {{ connectLabel }}
      </AppButton>
    </div>
  </template>

  <template v-else>
    <template v-if="view.manualAgentCommand">
      <p :class="styles.help()">{{ ai.aiSetupAgentInstall }}</p>
      <AppCopyField
        :value="view.manualAgentCommand"
        :copy-label="common.copy"
        :copied-label="common.copied"
      />
    </template>
    <template v-if="view.manualBridgeCommand">
      <p :class="styles.help()">{{ ai.aiSetupAgentMCPInstall }}</p>
      <AppCopyField
        :value="view.manualBridgeCommand"
        :copy-label="common.copy"
        :copied-label="common.copied"
      />
    </template>
  </template>

  <p :class="styles.help()">{{ ai.aiSetupAgentPromptHint({ agent: agent.name }) }}</p>
  <div :class="styles.actions()">
    <AppButton size="xs" variant="outline" @click="copy(prompt)">
      <template #leading>
        <icon-lucide-check v-if="copied" class="size-3" />
        <icon-lucide-copy v-else class="size-3" />
      </template>
      {{ copied ? common.copied : ai.aiSetupAgentCopyPrompt }}
    </AppButton>
  </div>
</template>
