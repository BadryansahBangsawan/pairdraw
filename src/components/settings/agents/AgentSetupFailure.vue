<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import type { ACPAgentDef } from '@open-pencil/core/constants'
import { useI18n } from '@open-pencil/vue/i18n'

import { agentConnectView, agentSetupView, type AgentSetupState } from '@/app/ai/agents/setup/view'
import SettingsLink from '@/components/settings/layout/SettingsLink.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppCopyField from '@/components/ui/input/AppCopyField.vue'
import { NODE_DOWNLOAD_URL } from '@/constants'
import theme from '@/theme/settings/agents'

import { useSetupProblemMessage } from './problem'

/**
 * Why connecting a coding agent stopped, with the fix: what to install or run by hand. Shows
 * nothing until an attempt has failed.
 */
const { agent, setup } = defineProps<{ agent: ACPAgentDef; setup: AgentSetupState }>()
const { ai, common } = useI18n()
const styles = tv(theme)()
const setupProblemMessage = useSetupProblemMessage()

const view = computed(() => agentSetupView(agent, setup))
const progress = computed(() => agentConnectView(agent, setup))
const failure = computed(() => progress.value.failure)
const account = computed(() => view.value.account)
const installProblem = computed(() => setupProblemMessage(progress.value.problem, agent.name))
</script>

<template>
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
</template>
