import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import AgentNotesFields from './AgentNotesFields.vue'

interface Args {
  context: string
  prompt: string
  disabled: boolean
  onCommit: (field: string, value: string) => void
  onRun: (prompt: string) => void
}

const meta = {
  title: 'App/Editor/Properties/Notes for AI',
  component: AgentNotesFields,
  args: { context: '', prompt: '', disabled: false, onCommit: fn(), onRun: fn() },
  parameters: {
    docs: {
      description: {
        component:
          "A layer's notes for agents, as the Design panel shows them: context agents respect when a message concerns the layer, and a prompt that runs in the chat."
      }
    }
  },
  render: (args) => ({
    components: { AgentNotesFields },
    setup: () => ({ args }),
    template: `
      <div class="w-[240px] bg-panel p-4">
        <AgentNotesFields v-bind="args" />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** No notes yet: Run waits for a prompt. */
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Run prompt' })).toBeDisabled()
  }
}

/** A field commits as it loses focus, once, rather than on every key. */
export const CommitOnBlur: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Context'), 'Opens the sign-up dialog')
    await expect(args.onCommit).not.toHaveBeenCalled()
    await userEvent.tab()
    await expect(args.onCommit).toHaveBeenCalledOnce()
    await expect(args.onCommit).toHaveBeenCalledWith('context', 'Opens the sign-up dialog')
  }
}

/** A layer with both notes; Run sends its prompt to the chat. */
export const WithNotes: Story = {
  args: {
    context: 'Opens the sign-up dialog',
    prompt: 'Make this the primary call to action'
  },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Run prompt' }))
    await expect(args.onRun).toHaveBeenCalledWith('Make this the primary call to action')
  }
}

export const Disabled: Story = {
  args: { context: 'Opens the sign-up dialog', disabled: true }
}
