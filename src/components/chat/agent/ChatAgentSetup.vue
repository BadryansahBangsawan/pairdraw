<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core'
import { compact } from 'es-toolkit/array'
import { computed, nextTick, onBeforeUnmount, useId, useTemplateRef, watch } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import type { AgentCandidate } from '@/app/ai/agents/auto/pick'
import type { AutoConnectPhase } from '@/app/ai/agents/auto/session'
import { agentConnectView, agentSetupView, type AgentSetupState } from '@/app/ai/agents/setup/view'
import { MCP_PACKAGE_NAME } from '@/app/automation/mcp/failure'
import { chatAgentTheme } from '@/components/chat/ui'
import AgentSetupFailure from '@/components/settings/agents/AgentSetupFailure.vue'
import AgentSetupStep from '@/components/settings/agents/AgentSetupStep.vue'
import AgentSignInProgress from '@/components/settings/agents/AgentSignInProgress.vue'
import { useSetupProblemMessage } from '@/components/settings/agents/problem'
import { useConnectStepLabel } from '@/components/settings/agents/step'
import SettingsLink from '@/components/settings/layout/SettingsLink.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppCopyField from '@/components/ui/input/AppCopyField.vue'
import { NODE_DOWNLOAD_URL } from '@/constants'

/**
 * The chat column before AI is set up: it looks for a coding agent on this computer, offers one
 * that needs a sign-in or its connector installed, and shows the connection's steps. Nothing is
 * signed in to or installed until the person clicks. When no agent can be used, it leads to
 * guided setup and Settings instead.
 */
const {
  phase,
  candidate = null,
  setup = null,
  waiting = false,
  fill = true
} = defineProps<{
  /** What looking for and connecting an agent is doing. */
  phase: AutoConnectPhase
  /** The agent offered or being connected, with what it still needs. */
  candidate?: AgentCandidate | null
  /** That agent's setup: what is installed, its login, and the connection's progress. */
  setup?: AgentSetupState | null
  /** A prompt waits for the chat to connect. */
  waiting?: boolean
  /** Fills the column, as it does while the conversation is empty. */
  fill?: boolean
}>()
const emit = defineEmits<{
  /** The card came into view, so the chat may look for agents now. */
  show: []
  /** Connects the agent; `installs` lets it install the agent's connector first. */
  connect: [options: { installs: boolean }]
  cancelSignIn: []
  submitSignInCode: [code: string]
  /** Opens guided setup. */
  setUp: []
  openSettings: []
  /** The card is going while it holds the keyboard focus, which the chat should take. */
  releaseFocus: []
}>()

const { ai, common } = useI18n()
const styles = computed(() => chatAgentTheme({ fill }))
const setupProblemMessage = useSetupProblemMessage()
const stepLabel = useConnectStepLabel()
const titleId = useId()

const root = useTemplateRef<HTMLElement>('root')
// A closed chat column keeps the card mounted but hidden; looking waits until it shows.
const visible = useElementVisibility(root)
watch(visible, (shown) => {
  if (shown) emit('show')
})

const agent = computed(() => candidate?.agent ?? null)
const setupView = computed(() => (agent.value && setup ? agentSetupView(agent.value, setup) : null))
const progress = computed(() =>
  agent.value && setup ? agentConnectView(agent.value, setup) : null
)

type CardState = 'detecting' | 'sign-in' | 'install' | 'connect' | 'connecting' | 'failed' | 'none'

const state = computed((): CardState => {
  if (phase === 'detecting') return 'detecting'
  if (!candidate || !setup) return 'none'
  if (phase === 'connecting') return 'connecting'
  if (phase === 'failed') {
    // An attempt that could not install stopped there: the install is the fix to offer.
    return progress.value?.failure?.problem === 'install-needed' ? 'install' : 'failed'
  }
  if (phase !== 'action') return 'none'
  if (candidate.state === 'sign-in') return 'sign-in'
  if (candidate.state === 'install') return 'install'
  return 'connect'
})

/** The packages Pairdraw installs to talk to the agent: its adapter and the MCP server. */
const connectorPackages = computed(() => {
  const packages: string[] = []
  const adapter = agent.value?.adapterPackage
  if (setup?.detected?.status === 'needs-adapter' && adapter) packages.push(adapter)
  if (!setup?.bridge || setup.bridgeOutdated) packages.push(MCP_PACKAGE_NAME)
  return packages.join(', ')
})
/** Commands the person runs because one click cannot install, such as without admin rights. */
const manualCommands = computed(() => {
  const view = setupView.value
  if (!view) return []
  return compact([view.manualAgentCommand, view.manualBridgeCommand])
})
const installProblem = computed(() =>
  setupProblemMessage(setupView.value?.problem ?? null, agent.value?.name)
)
const account = computed(() => setupView.value?.account ?? null)
/** States that wait for the person: an offer, or an attempt that stopped. */
const offers = computed(() => ['sign-in', 'install', 'connect', 'failed'].includes(state.value))
const busy = computed(() => progress.value?.running === true || setupView.value?.busy === true)

/** What the card says now, read out from a line that stays while the card changes around it. */
const announcement = computed(() => {
  const current = agent.value
  if (state.value === 'none') {
    return phase === 'none' ? ai.value.chatAgentNoneFound : ai.value.connectProvider
  }
  if (state.value === 'detecting' || !current) return ai.value.chatAgentDetecting
  if (state.value === 'sign-in') return ai.value.chatAgentSignInNeeded({ agent: current.name })
  if (state.value === 'install') {
    return ai.value.chatAgentInstallNeeded({
      agent: current.name,
      package: connectorPackages.value
    })
  }
  if (state.value === 'connecting') return `${current.name}: ${ai.value.aiSetupConnecting}`
  if (state.value === 'connect') return `${current.name}: ${ai.value.aiSetupDetectFound}`
  // A failed step names itself in its own alert.
  return ''
})
/** The line under the card's actions while a prompt waits, naming the agent once there is one. */
const waitingText = computed(() =>
  agent.value
    ? ai.value.chatAgentPromptWaiting({ agent: agent.value.name })
    : ai.value.chatAgentPromptWaitingSetup
)

const heading = useTemplateRef<HTMLElement>('heading')
function holdsFocus(): boolean {
  return root.value?.contains(document.activeElement) ?? false
}
// A click that moves the card on removes the button it was on; the focus stays in the card,
// on its title, rather than falling back to the start of the window.
watch(state, async () => {
  if (!holdsFocus()) return
  await nextTick()
  if (holdsFocus()) return
  const target = heading.value ?? root.value
  target?.focus()
})
onBeforeUnmount(() => {
  if (holdsFocus()) emit('releaseFocus')
})
</script>

<template>
  <div ref="root" data-test-id="provider-setup" tabindex="-1" :class="styles.root()">
    <p role="status" :class="styles.announcement()">{{ announcement }}</p>
    <AppPlaceholder
      v-if="state === 'none'"
      :label="phase === 'none' ? ai.chatAgentNoneFound : ai.connectProvider"
      :description="waiting ? ai.chatAgentPromptWaitingSetup : undefined"
      :fill="false"
      :ui="{ root: styles.placeholder() }"
    >
      <template #icon>
        <icon-lucide-sparkles class="size-5" />
      </template>
      <template #action>
        <div :class="styles.actions()">
          <AppButton color="primary" variant="solid" size="md" @click="emit('setUp')">
            {{ ai.chatAgentSetUp }}
          </AppButton>
          <AppButton
            variant="outline"
            size="md"
            data-test-id="provider-setup-open-settings"
            @click="emit('openSettings')"
          >
            {{ ai.openProviderSettings }}
          </AppButton>
        </div>
      </template>
    </AppPlaceholder>

    <section v-else :class="styles.card()" :aria-labelledby="titleId">
      <div :class="styles.header()">
        <span :class="styles.tile()" aria-hidden="true">
          <icon-lucide-loader-2 v-if="state === 'detecting'" :class="styles.tileSpinner()" />
          <icon-lucide-bot v-else :class="styles.tileIcon()" />
        </span>
        <div ref="heading" tabindex="-1" :class="styles.heading()">
          <p v-if="state === 'detecting' || !agent" :id="titleId" :class="styles.title()">
            {{ ai.chatAgentDetecting }}
          </p>
          <p v-else-if="state === 'sign-in'" :id="titleId" :class="styles.title()">
            {{ ai.chatAgentSignInNeeded({ agent: agent.name }) }}
          </p>
          <p v-else-if="state === 'install'" :id="titleId" :class="styles.title()">
            {{ ai.chatAgentInstallNeeded({ agent: agent.name, package: connectorPackages }) }}
          </p>
          <template v-else>
            <p :id="titleId" :class="styles.title()">{{ agent.name }}</p>
            <p v-if="state === 'connecting'" :class="styles.description()">
              {{ ai.aiSetupConnecting }}
            </p>
            <p v-else-if="state === 'connect'" :class="styles.description()">
              {{ ai.aiSetupDetectFound }}
            </p>
          </template>
        </div>
      </div>

      <template v-if="state !== 'detecting' && agent && setup && progress">
        <ol
          v-if="state === 'connecting' || state === 'failed'"
          :class="styles.steps()"
          :aria-label="ai.aiSetupConnect({ agent: agent.name })"
        >
          <AgentSetupStep v-for="{ step, status } in progress.steps" :key="step" :status="status">
            {{ stepLabel(step, agent) }}
          </AgentSetupStep>
        </ol>

        <template v-if="state === 'connecting' && account?.state === 'signing-in'">
          <AgentSignInProgress :account="account" @submit-code="emit('submitSignInCode', $event)" />
          <AppButton variant="outline" size="md" @click="emit('cancelSignIn')">
            {{ common.cancel }}
          </AppButton>
        </template>

        <AgentSetupFailure v-if="state === 'failed'" :agent="agent" :setup="setup" />

        <template v-if="state === 'install'">
          <template v-if="manualCommands.length">
            <AppAlert v-if="installProblem" tone="warning" :heading="installProblem">
              <template v-if="setupView?.problem === 'needs-npm'" #actions>
                <SettingsLink :href="NODE_DOWNLOAD_URL">Node.js</SettingsLink>
              </template>
            </AppAlert>
            <AppCopyField
              v-for="command in manualCommands"
              :key="command"
              :value="command"
              :copy-label="common.copy"
              :copied-label="common.copied"
            />
          </template>
          <p
            v-else-if="setupView?.canInstallAdapter && agent.installCommand"
            :class="styles.help()"
          >
            {{ ai.aiSetupAgentInstallRuns({ command: agent.installCommand }) }}
          </p>
        </template>

        <div v-if="offers" :class="styles.actions()">
          <AppButton
            v-if="state === 'sign-in'"
            color="primary"
            variant="solid"
            size="md"
            :disabled="busy"
            @click="emit('connect', { installs: false })"
          >
            {{ ai.chatAgentSignIn({ agent: agent.name }) }}
          </AppButton>
          <AppButton
            v-else-if="state === 'install' && manualCommands.length"
            color="primary"
            variant="solid"
            size="md"
            :disabled="busy"
            @click="emit('connect', { installs: false })"
          >
            {{ ai.aiSetupAgentCheckAgain }}
          </AppButton>
          <AppButton
            v-else-if="state === 'install'"
            color="primary"
            variant="solid"
            size="md"
            :disabled="busy"
            @click="emit('connect', { installs: true })"
          >
            {{ ai.chatAgentInstall }}
          </AppButton>
          <AppButton
            v-else-if="state === 'failed'"
            color="primary"
            variant="solid"
            size="md"
            :disabled="busy"
            @click="emit('connect', { installs: candidate?.state === 'install' })"
          >
            {{ ai.retryRequest }}
          </AppButton>
          <AppButton
            v-else
            color="primary"
            variant="solid"
            size="md"
            :disabled="busy"
            @click="emit('connect', { installs: false })"
          >
            {{ ai.aiSetupConnect({ agent: agent.name }) }}
          </AppButton>
          <AppButton size="md" @click="emit('setUp')">{{ ai.chatAgentSetUp }}</AppButton>
        </div>
      </template>

      <!-- Shown while looking too, so a prompt sent before setup is never out of sight. -->
      <p v-if="waiting" :class="styles.waiting()">
        <icon-lucide-clock :class="styles.waitingIcon()" aria-hidden="true" />
        {{ waitingText }}
      </p>
    </section>
  </div>
</template>
