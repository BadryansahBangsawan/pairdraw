import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, screen, userEvent, within } from 'storybook/test'

import { startAgentSessionControls } from '@/app/ai/agents/acp/session/store'

import ChatAgentSessionControls from './ChatAgentSessionControls.vue'

interface Args {
  agentId: string
  agent: string
  onError: (message: string) => void
}

/** What Codex's adapter advertises: a model and reasoning effort as config options, and modes. */
async function advertise(agentId: string): Promise<void> {
  await startAgentSessionControls(
    agentId,
    {
      configOptions: [
        {
          type: 'select',
          id: 'model',
          name: 'Model',
          category: 'model',
          currentValue: 'gpt-5-codex',
          options: [
            { value: 'gpt-5-codex', name: 'GPT-5 Codex' },
            { value: 'gpt-5', name: 'GPT-5' }
          ]
        },
        {
          type: 'select',
          id: 'reasoning_effort',
          name: 'Reasoning',
          category: 'thought_level',
          currentValue: 'medium',
          options: [
            { value: 'low', name: 'Low' },
            { value: 'medium', name: 'Medium' },
            { value: 'high', name: 'High' }
          ]
        }
      ],
      modes: {
        currentModeId: 'read-only',
        availableModes: [
          { id: 'read-only', name: 'Read only' },
          { id: 'auto', name: 'Auto' },
          { id: 'full-access', name: 'Full access' }
        ]
      }
    },
    async () => null
  )
}

const meta = {
  title: 'App/Chat/Agent Session Controls',
  args: { agentId: 'story-codex', agent: 'Codex', onError: fn() },
  loaders: [({ args }) => advertise(args.agentId)],
  parameters: {
    docs: {
      description: {
        component:
          'The model, reasoning effort, and mode a coding agent advertised for its sessions, beside the model in the composer. A choice applies to the running session and to every later one.'
      }
    }
  },
  render: (args) => ({
    components: { ChatAgentSessionControls },
    setup: () => ({ args }),
    template:
      '<div class="@container flex w-96 items-center rounded-card border border-border bg-panel p-2"><ChatAgentSessionControls v-bind="args" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Codex: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('combobox', { name: 'Model: GPT-5 Codex' })).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Reasoning effort: Medium' })).toBeVisible()
    await userEvent.click(canvas.getByRole('combobox', { name: 'Mode: Read only' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Auto' }))
    const mode = await canvas.findByRole('combobox', { name: 'Mode: Auto' })
    // Choices are kept for the agent's next sessions, so the story leaves the one it started with.
    await userEvent.click(mode)
    await userEvent.click(await screen.findByRole('option', { name: 'Read only' }))
    await expect(await canvas.findByRole('combobox', { name: 'Mode: Read only' })).toBeVisible()
  }
}

/** In a narrow composer reasoning and mode keep only their icon; the tooltip names the value. */
export const Narrow: Story = {
  args: { agentId: 'story-codex-narrow' },
  render: (args) => ({
    components: { ChatAgentSessionControls },
    setup: () => ({ args }),
    template:
      '<div class="@container flex w-56 items-center rounded-card border border-border bg-panel p-2"><ChatAgentSessionControls v-bind="args" /></div>'
  })
}
