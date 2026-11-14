import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'

import { ACP_AGENTS, type ACPAgentID } from '@pairdraw/core/constants'

import type {
  AgentConnectProblem,
  AgentConnectState,
  AgentConnectStep
} from '@/app/ai/agents/setup/connect'
import type { DetectedAgent } from '@/app/ai/agents/setup/discovery'
import type { AgentSetupState, PiSetupState } from '@/app/ai/agents/setup/view'
import { agentAccount as account } from '@/components/settings/agents/stories/fixtures'

import AISetupConnection from './AISetupConnection.vue'

interface Args {
  providerID:
    | 'openrouter'
    | 'anthropic'
    | 'openai-compatible'
    | 'acp:claude-code'
    | 'acp:codex'
    | 'acp:gemini-cli'
    | 'harness:pi'
  signInStatus: 'idle' | 'waiting' | 'verifying' | 'blocked' | 'cancelled' | 'expired' | 'failed'
  account: { label: string; freeTier: boolean } | null
  agentSetup?: AgentSetupState
  piSetup?: PiSetupState
  hasSavedKey: boolean
  recommended: boolean
}

function detected(id: ACPAgentID, status: DetectedAgent['status']): DetectedAgent {
  const definition = ACP_AGENTS.find((agent) => agent.id === id) ?? ACP_AGENTS[0]
  return { definition, cliPath: null, adapterPath: null, status }
}

function agentSetup(overrides: Partial<AgentSetupState>): AgentSetupState {
  return {
    supported: true,
    checked: true,
    scanning: false,
    detected: null,
    bridge: false,
    bridgeOutdated: false,
    bridgeCommand: 'npm i -g @pairdraw/mcp@0.15.1',
    npm: true,
    installingAgent: false,
    installingBridge: false,
    error: null,
    ...overrides
  }
}

function connection(overrides: Partial<AgentConnectState>): AgentConnectState {
  return {
    steps: {
      detect: 'pending',
      install: 'pending',
      'sign-in': 'pending',
      tools: 'pending',
      activate: 'pending'
    },
    running: false,
    failure: null,
    activates: false,
    ...overrides
  }
}

/** An attempt that stopped at `step`, after the steps before it finished. */
function failedAt(step: AgentConnectStep, problem: AgentConnectProblem): AgentConnectState {
  const order: AgentConnectStep[] = ['detect', 'install', 'sign-in', 'tools', 'activate']
  const index = order.indexOf(step)
  const steps = connection({}).steps
  for (const [position, name] of order.entries()) {
    if (position < index) steps[name] = 'done'
  }
  steps[step] = 'failed'
  return connection({ steps, failure: { step, problem } })
}

function piSetup(overrides: Partial<PiSetupState>): PiSetupState {
  return {
    supported: true,
    checked: true,
    scanning: false,
    companion: false,
    companionOutdated: false,
    companionCommand: 'npm i -g @pairdraw/harness@0.15.1',
    bridge: false,
    bridgeOutdated: false,
    bridgeCommand: 'npm i -g @pairdraw/mcp@0.15.1',
    npm: true,
    installingCompanion: false,
    installingBridge: false,
    defaultModel: null,
    error: null,
    ...overrides
  }
}

const meta = {
  title: 'App/Settings/AI Setup/Connection',
  args: {
    providerID: 'openrouter',
    signInStatus: 'idle',
    hasSavedKey: false,
    recommended: true,
    account: null
  },
  render: (args) => ({
    components: { AISetupConnection },
    setup: () => ({
      args,
      state: {
        apiKey: args.account ? 'sk-or-story' : '',
        customBaseURL: '',
        customModelID: '',
        test: 'idle',
        reason: null,
        account: args.account
      }
    }),
    template:
      '<div class="w-[30rem] max-w-full"><AISetupConnection v-bind="args" :state="state" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const OpenRouterSignIn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Sign in with OpenRouter' })).toBeVisible()
    await expect(canvas.getByLabelText('API Key')).toBeVisible()
  }
}
export const OpenRouterWaiting: Story = {
  args: { signInStatus: 'waiting' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Sign in with OpenRouter' })).toBeNull()
  }
}
export const OpenRouterVerifying: Story = { args: { signInStatus: 'verifying' } }
export const OpenRouterSignedIn: Story = {
  args: { account: { label: 'Pairdraw', freeTier: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toHaveTextContent('Signed in to OpenRouter')
    await expect(canvas.queryByLabelText('API Key')).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Test connection' })).toBeNull()
  }
}
export const OpenRouterSignedInWithoutCredits: Story = {
  args: { account: { label: 'Pairdraw', freeTier: true } }
}
export const OpenRouterPopupBlocked: Story = { args: { signInStatus: 'blocked' } }
export const OpenRouterFailed: Story = { args: { signInStatus: 'failed' } }
export const OpenRouterExpired: Story = { args: { signInStatus: 'expired' } }
export const SavedAPIKey: Story = {
  args: { providerID: 'anthropic', hasSavedKey: true, recommended: false }
}
export const LocalServer: Story = { args: { providerID: 'openai-compatible', recommended: false } }
export const CodingAgentInBrowser: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({ supported: false })
  }
}
export const CodingAgentChecking: Story = {
  args: {
    providerID: 'acp:codex',
    recommended: false,
    agentSetup: agentSetup({ scanning: true, checked: false })
  }
}
export const CodingAgentInstalled: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({ detected: detected('claude-code', 'available'), bridge: true })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Connect Claude Code' })).toBeEnabled()
    await expect(canvas.queryByText(/npm i -g/)).toBeNull()
  }
}
export const CodingAgentNeedsAdapter: Story = {
  args: {
    providerID: 'acp:codex',
    recommended: false,
    agentSetup: agentSetup({ detected: detected('codex', 'needs-adapter') })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Connect Codex' })).toBeEnabled()
    await expect(
      canvas.getByText('Installing runs npm i -g @agentclientprotocol/codex-acp.')
    ).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      'https://openpencil.dev/programmable/coding-agents#codex'
    )
  }
}
export const CodingAgentConnecting: Story = {
  args: {
    providerID: 'acp:codex',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('codex', 'needs-adapter'),
      installingAgent: true,
      connection: connection({
        running: true,
        steps: { ...connection({}).steps, detect: 'done', install: 'running' }
      })
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Connecting…' })).toBeDisabled()
  }
}
export const CodingAgentNeedsNpm: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('claude-code', 'needs-adapter'),
      npm: false,
      error: 'npm',
      connection: failedAt('install', 'npm')
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('link', { name: 'Node.js' })).toBeVisible()
    await expect(canvas.getByText('npm i -g @agentclientprotocol/claude-agent-acp')).toBeVisible()
    await expect(canvas.getByText(/npm i -g @pairdraw\/mcp@/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeEnabled()
  }
}
export const CodingAgentNeedsAdmin: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('claude-code', 'needs-adapter'),
      adapterNeedsAdmin: true,
      bridgeNeedsAdmin: true,
      bridgeCommand: 'sudo npm i -g @pairdraw/mcp@0.15.1',
      error: 'npm-admin',
      connection: failedAt('install', 'npm-admin')
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/needs administrator rights/)).toBeVisible()
    await expect(canvas.getByText(/^sudo npm i -g @pairdraw\/mcp@/)).toBeVisible()
  }
}
export const CodingAgentSignedIn: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('claude-code', 'available'),
      bridge: true,
      account: account({
        status: { kind: 'account', label: 'Claude Max', account: { email: 'ada@example.com' } },
        tools: { connected: true }
      })
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/Claude Max · ada@example\.com/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Check again' })).toBeEnabled()
  }
}
export const CodingAgentToolsUnreachable: Story = {
  args: {
    providerID: 'acp:codex',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('codex', 'available'),
      bridge: true,
      account: account({
        status: { kind: 'account', label: 'ChatGPT Pro', account: { email: 'ada@example.com' } },
        adapter: { name: '@agentclientprotocol/codex-acp', version: '2.2.2' },
        tools: {
          connected: false,
          reason:
            '[codex-acp] MCP server `pairdraw` was not started, because the Codex config already defines an MCP server with this name.'
        }
      }),
      connection: failedAt('tools', 'tools')
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/Codex can’t reach Pairdraw’s tools/)).toBeVisible()
    await expect(canvas.getByText(/already defines an MCP server/)).toBeVisible()
  }
}
export const CodingAgentSignedOut: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('claude-code', 'available'),
      bridge: true,
      account: account({}),
      connection: failedAt('sign-in', 'signed-out')
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/isn’t signed in yet/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeEnabled()
  }
}
export const CodingAgentExternalConfig: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({
      detected: { ...detected('claude-code', 'available'), externalConfig: 'bedrock' },
      bridge: true,
      account: account({ status: { kind: 'external', label: 'AWS Bedrock' }, canSignIn: false })
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Set up for Amazon Bedrock outside the app, and reporting that login, it needs no sign-in.
    await expect(canvas.getByText(/External config · Amazon Bedrock/)).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /Sign in/ })).toBeNull()
  }
}
export const CodingAgentSigningIn: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('claude-code', 'available'),
      bridge: true,
      account: account({
        signingIn: true,
        signInURL: 'https://claude.com/cai/oauth/authorize',
        acceptsCode: true
      }),
      connection: connection({
        running: true,
        steps: { ...connection({}).steps, detect: 'done', install: 'skipped', 'sign-in': 'running' }
      })
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Finish signing in in your browser.')).toBeVisible()
    await expect(canvas.getByRole('link', { name: /Open the sign-in page/ })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Submit code' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeVisible()
  }
}
export const CodingAgentOtherAdapter: Story = {
  args: {
    providerID: 'acp:codex',
    recommended: false,
    agentSetup: agentSetup({
      detected: { ...detected('codex', 'available'), adapterPath: '/Users/ada/.bun/bin/codex-acp' },
      bridge: true,
      account: account({ status: null, adapter: { name: 'codex-acp', version: '0.10.0' } }),
      connection: failedAt('sign-in', 'adapter-mismatch')
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByText(/found \/Users\/ada\/\.bun\/bin\/codex-acp, another adapter/)
    ).toBeVisible()
    await expect(canvas.getByText('npm i -g @agentclientprotocol/codex-acp')).toBeVisible()
  }
}
export const CodingAgentCLIMissing: Story = {
  args: {
    providerID: 'acp:gemini-cli',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('gemini-cli', 'not-installed'),
      bridge: true,
      connection: failedAt('install', 'cli-missing')
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('link', { name: 'Install Gemini CLI' })).toBeVisible()
    await expect(canvas.getByText('npm i -g @google/gemini-cli')).toBeVisible()
  }
}
export const CodingAgentManualSignIn: Story = {
  args: {
    providerID: 'acp:gemini-cli',
    recommended: false,
    agentSetup: agentSetup({ detected: detected('gemini-cli', 'available'), bridge: true })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('gemini', { exact: true })).toBeVisible()
  }
}
export const PiNeedsCompanion: Story = {
  args: {
    providerID: 'harness:pi',
    recommended: false,
    piSetup: piSetup({ defaultModel: 'openai-codex/gpt-5.6' })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Install companion' })).toBeVisible()
    await expect(canvas.getByText(/openai-codex\/gpt-5\.6/)).toBeVisible()
    await expect(canvas.queryByLabelText('API Key')).toBeNull()
  }
}
export const PiReady: Story = {
  args: {
    providerID: 'harness:pi',
    recommended: false,
    piSetup: piSetup({ companion: true, bridge: true, defaultModel: 'openai-codex/gpt-5.6' })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole('button', { name: 'Install companion' })).toBeNull()
    await expect(canvas.queryByText(/npm i -g/)).toBeNull()
  }
}
export const PiNeedsNpm: Story = {
  args: { providerID: 'harness:pi', recommended: false, piSetup: piSetup({ npm: false }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/npm i -g @pairdraw\/harness@/)).toBeVisible()
  }
}
export const PiOutdatedMCPFromBun: Story = {
  args: {
    providerID: 'harness:pi',
    recommended: false,
    piSetup: piSetup({
      companion: true,
      bridge: true,
      bridgeOutdated: true,
      bridgeCommand: 'bun add -g @pairdraw/mcp@0.15.1',
      defaultModel: 'openai-codex/gpt-5.6',
      error: 'canvas-install'
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/Pairdraw MCP server · update needed/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Update MCP server' })).toBeVisible()
    await expect(canvas.getByText('bun add -g @pairdraw/mcp@0.15.1')).toBeVisible()
  }
}
