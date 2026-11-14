import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import type { MCPClientStatus } from '@/app/automation/mcp/clients/service'
import type { MCPClientChangeNotice } from '@/app/automation/mcp/clients/settings/use'

import MCPClientsSection from './MCPClientsSection.vue'

const statuses: MCPClientStatus[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    displayPath: '~/.claude.json',
    installed: true,
    state: 'added'
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    displayPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
    installed: true,
    state: 'absent'
  },
  {
    id: 'codex',
    name: 'Codex',
    displayPath: '~/.codex/config.toml',
    installed: true,
    state: 'manual'
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    displayPath: '~/.gemini/settings.json',
    installed: false,
    state: 'absent'
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    displayPath: '~/.config/opencode/opencode.json',
    installed: true,
    state: 'custom'
  },
  {
    id: 'kiro',
    name: 'Kiro',
    displayPath: '~/.kiro/settings/mcp.json',
    installed: true,
    state: 'invalid'
  },
  { id: 'cursor', name: 'Cursor', installed: true, state: 'unreadable' },
  {
    id: 'vs-code',
    name: 'VS Code',
    displayPath: '~/Library/Application Support/Code/User/mcp.json',
    installed: true,
    state: 'absent'
  }
]

const claudeDesktop: MCPClientStatus = {
  id: 'claude-desktop',
  name: 'Claude Desktop',
  displayPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
  installed: true,
  state: 'added'
}

const added: MCPClientChangeNotice = {
  client: 'claude-desktop',
  name: 'Claude Desktop',
  change: {
    outcome: 'saved',
    enabled: true,
    status: claudeDesktop,
    backup: '~/Library/Application Support/Claude/claude_desktop_config.json.pairdraw.bak'
  }
}

const failed: MCPClientChangeNotice = {
  client: 'vs-code',
  name: 'VS Code',
  change: { outcome: 'failed', enabled: true, reason: 'changed' }
}

type Args = {
  statuses: MCPClientStatus[]
  loading: boolean
  pending: MCPClientStatus['id'] | null
  notice: MCPClientChangeNotice | null
  onToggle: (client: MCPClientStatus['id'], enabled: boolean) => void
  onRefresh: () => void
}

const meta = {
  title: 'App/Settings/MCP/Other Apps',
  args: {
    statuses,
    loading: false,
    pending: null,
    notice: null,
    onToggle: fn(),
    onRefresh: fn()
  },
  render: (args) => ({
    components: { MCPClientsSection },
    setup: () => ({ args }),
    template: '<div class="max-w-lg bg-panel p-4"><MCPClientsSection v-bind="args" /></div>'
  })
} satisfies Meta<Args>
export default meta
type Story = StoryObj<typeof meta>

export const Clients: Story = {}

export const Loading: Story = { args: { statuses: [], loading: true } }

export const Changing: Story = { args: { pending: 'vs-code' } }

export const Added: Story = {
  args: {
    statuses: statuses.map((status) => (status.id === claudeDesktop.id ? claudeDesktop : status)),
    notice: added
  }
}

export const Failed: Story = { args: { notice: failed } }

/** Only clients set up here, with a file the app can change, offer a working switch. */
export const SwitchAClient: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('switch', { name: /VS Code/ }))
    await expect(args.onToggle).toHaveBeenCalledWith('vs-code', true)
    await expect(canvas.getByRole('switch', { name: /Gemini CLI/ })).toBeDisabled()
    await expect(canvas.getByRole('switch', { name: /Kiro/ })).toBeDisabled()
  }
}
