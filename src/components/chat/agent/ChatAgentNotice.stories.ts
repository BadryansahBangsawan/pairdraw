import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import ChatAgentNotice from './ChatAgentNotice.vue'

interface Args {
  agent: string
  provider?: string
  signedOut?: boolean
  signInCommand?: string | null
  onChange: () => void
  onDismiss: () => void
  onRetry: () => void
}

const meta = {
  title: 'App/Chat/Agent Notice',
  args: {
    agent: 'Claude Code',
    provider: 'acp:claude-code',
    signedOut: false,
    signInCommand: null,
    onChange: fn(),
    onDismiss: fn(),
    onRetry: fn()
  },
  parameters: {
    docs: {
      description: {
        component:
          'Names the coding agent the chat switched to on its own, or shows where to sign in when that agent refused a message because nobody is signed in to it.'
      }
    }
  },
  render: (args) => ({
    components: { ChatAgentNotice },
    setup: () => ({ args }),
    template:
      '<div class="w-80 rounded-card border border-border bg-panel py-2"><ChatAgentNotice v-bind="args" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Using: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Using Claude Code from this computer.')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }))
    await expect(args.onChange).toHaveBeenCalledOnce()
  }
}

/** Gemini CLI does not report its login, so its sign-in shows after it refused a message. */
export const SignedOut: Story = {
  args: { agent: 'Gemini CLI', signedOut: true, signInCommand: 'gemini' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Gemini CLI is on this computer but signed out.'
    )
    await expect(canvas.getByText('gemini')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }))
    await expect(args.onRetry).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }))
    await expect(args.onChange).toHaveBeenCalledOnce()
  }
}
