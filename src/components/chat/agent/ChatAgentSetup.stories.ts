import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { ref } from 'vue'

import { ACP_AGENTS, type ACPAgentDef } from '@open-pencil/core/constants'

import type { AgentCandidate, AgentCandidateState } from '@/app/ai/agents/auto/pick'
import type { AutoConnectPhase } from '@/app/ai/agents/auto/session'
import type {
  AgentConnectProblem,
  AgentConnectState,
  AgentConnectStep,
  AgentConnectStepState
} from '@/app/ai/agents/setup/connect'
import type { DetectedAgent } from '@/app/ai/agents/setup/discovery'
import type { AgentSetupState } from '@/app/ai/agents/setup/view'
import { agentAccount as account } from '@/components/settings/agents/stories/fixtures'

import ChatAgentSetup from './ChatAgentSetup.vue'

interface Args {
  phase: AutoConnectPhase
  candidate?: AgentCandidate | null
  setup?: AgentSetupState | null
  waiting?: boolean
  onShow: () => void
  onConnect: (options: { installs: boolean }) => void
  onCancelSignIn: () => void
  onSubmitSignInCode: (code: string) => void
  onSetUp: () => void
  onOpenSettings: () => void
}

const claude: ACPAgentDef = ACP_AGENTS.find((agent) => agent.id === 'claude-code') ?? ACP_AGENTS[0]
const STEPS: AgentConnectStep[] = ['detect', 'install', 'sign-in', 'tools', 'activate']

function candidate(state: AgentCandidateState): AgentCandidate {
  return { agent: claude, state }
}

function detected(status: DetectedAgent['status']): DetectedAgent {
  return {
    definition: claude,
    cliPath: '/usr/local/bin/claude',
    adapterPath: status === 'available' ? '/usr/local/bin/claude-agent-acp' : null,
    status
  }
}

/** An attempt whose steps before `current` finished, with `current` in the given state. */
function connection(
  current: AgentConnectStep,
  state: AgentConnectStepState,
  problem?: AgentConnectProblem
): AgentConnectState {
  const index = STEPS.indexOf(current)
  const steps: AgentConnectState['steps'] = {
    detect: 'pending',
    install: 'pending',
    'sign-in': 'pending',
    tools: 'pending',
    activate: 'pending'
  }
  for (const [position, step] of STEPS.entries()) {
    if (position < index) steps[step] = 'done'
  }
  steps[current] = state
  return {
    steps,
    running: state === 'running',
    failure: problem ? { step: current, problem } : null,
    activates: true
  }
}

function setup(overrides: Partial<AgentSetupState> = {}): AgentSetupState {
  return {
    supported: true,
    checked: true,
    scanning: false,
    detected: detected('available'),
    bridge: true,
    bridgeOutdated: false,
    bridgeCommand: 'npm i -g @open-pencil/mcp@0.15.1',
    npm: true,
    installingAgent: false,
    installingBridge: false,
    error: null,
    account: account(),
    ...overrides
  }
}

const meta = {
  title: 'App/Chat/Agent Setup',
  args: {
    phase: 'detecting',
    candidate: null,
    setup: null,
    waiting: false,
    onShow: fn(),
    onConnect: fn(),
    onCancelSignIn: fn(),
    onSubmitSignInCode: fn(),
    onSetUp: fn(),
    onOpenSettings: fn()
  },
  parameters: {
    docs: {
      description: {
        component:
          'The chat column before AI is set up: it looks for a coding agent on this computer, offers one that needs a sign-in or its connector installed, and connects it only on a click.'
      }
    }
  },
  render: (args) => ({
    components: { ChatAgentSetup },
    setup: () => ({ args }),
    template:
      '<div class="flex h-[30rem] w-80 flex-col rounded-card border border-border bg-panel"><ChatAgentSetup v-bind="args" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** A prompt sent before setup waits while the chat looks, and says so. */
export const Detecting: Story = {
  args: { waiting: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Looking for coding agents on this computer…'
    )
    await expect(canvas.getByText('Your prompt is sent once AI is set up.')).toBeVisible()
    await expect(canvas.queryByRole('button')).toBeNull()
  }
}

export const NeedsSignIn: Story = {
  args: {
    phase: 'action',
    candidate: candidate('sign-in'),
    setup: setup(),
    waiting: true
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in to Claude Code' }))
    await expect(args.onConnect).toHaveBeenCalledWith({ installs: false })
  }
}

export const SigningInWithURL: Story = {
  args: {
    phase: 'connecting',
    candidate: candidate('sign-in'),
    setup: setup({
      account: account({
        signingIn: true,
        signInURL: 'https://claude.ai/oauth/authorize?code=true',
        acceptsCode: true
      }),
      connection: connection('sign-in', 'running')
    }),
    waiting: true
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('link', { name: /sign-in page/ })).toHaveAttribute(
      'href',
      'https://claude.ai/oauth/authorize?code=true'
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }))
    await expect(args.onCancelSignIn).toHaveBeenCalledOnce()
  }
}

export const NeedsInstall: Story = {
  args: {
    phase: 'action',
    candidate: candidate('install'),
    setup: setup({ detected: detected('needs-adapter'), account: account({ status: undefined }) })
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Install and connect' }))
    await expect(args.onConnect).toHaveBeenCalledWith({ installs: true })
  }
}

/** npm's global folder needs administrator rights, so the person runs the command. */
export const NeedsInstallAdmin: Story = {
  args: {
    phase: 'action',
    candidate: candidate('install'),
    setup: setup({
      detected: detected('needs-adapter'),
      adapterNeedsAdmin: true,
      account: account({ status: undefined })
    })
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole('button', { name: 'Install and connect' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Check again' }))
    await expect(args.onConnect).toHaveBeenCalledWith({ installs: false })
  }
}

export const Connecting: Story = {
  args: {
    phase: 'connecting',
    candidate: candidate('install'),
    setup: setup({
      detected: detected('needs-adapter'),
      installingAgent: true,
      connection: connection('install', 'running')
    }),
    waiting: true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('list')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Retry' })).toBeNull()
  }
}

/** A signed-in agent whose session could not reach Pairdraw's tools. */
export const Failed: Story = {
  args: {
    phase: 'failed',
    candidate: candidate('ready'),
    setup: setup({
      account: account({
        status: { kind: 'account', label: 'Claude Max', account: { email: 'ada@example.com' } },
        tools: { connected: false, reason: null }
      }),
      connection: connection('tools', 'failed', 'tools')
    }),
    waiting: true
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }))
    await expect(args.onConnect).toHaveBeenCalledWith({ installs: false })
    await userEvent.click(canvas.getByRole('button', { name: 'Set up AI' }))
    await expect(args.onSetUp).toHaveBeenCalledOnce()
  }
}

export const NoneFound: Story = {
  args: { phase: 'none', waiting: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'No coding agent found on this computer.'
    )
    await expect(canvas.getByText('Your prompt is sent once AI is set up.')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Set up AI' }))
    await expect(args.onSetUp).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole('button', { name: 'Open provider settings' }))
    await expect(args.onOpenSettings).toHaveBeenCalledOnce()
  }
}

/**
 * Signing in replaces the button that was pressed; the keyboard focus stays in the card, on its
 * title, instead of falling back to the start of the window.
 */
export const KeepsFocusWhenConnecting: Story = {
  render: () => ({
    components: { ChatAgentSetup },
    setup() {
      const phase = ref<AutoConnectPhase>('action')
      const current = ref(setup())
      function connect() {
        phase.value = 'connecting'
        current.value = setup({
          account: account({ signingIn: true }),
          connection: connection('sign-in', 'running')
        })
      }
      return { phase, current, connect, signIn: candidate('sign-in') }
    },
    template:
      '<div class="flex h-[30rem] w-80 flex-col rounded-card border border-border bg-panel"><ChatAgentSetup :phase="phase" :candidate="signIn" :setup="current" @connect="connect" /></div>'
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: 'Sign in to Claude Code' })
    button.focus()
    await userEvent.keyboard('{Enter}')
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await waitFor(() =>
      expect(canvasElement.contains(canvasElement.ownerDocument.activeElement)).toBe(true)
    )
  }
}
