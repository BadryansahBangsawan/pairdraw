import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import type { TurnUsage } from '@/app/ai/chat/usage/aggregate'

import ChatUsageMeter from './ChatUsageMeter.vue'

type Args = { usage: TurnUsage; costUsd: number | null; scope: 'turn' | 'chat' }

const meta = {
  title: 'App/Chat/Usage Meter',
  tags: ['autodocs'],
  args: {
    usage: {
      inputTokens: 40_100,
      outputTokens: 2200,
      cacheReadTokens: 31_000,
      reasoningTokens: 800
    },
    costUsd: 0.1533,
    scope: 'turn'
  },
  render: (args) => ({
    components: { ChatUsageMeter },
    setup: () => args,
    template:
      '<div class="flex w-72 justify-end bg-panel p-2"><ChatUsageMeter :usage="usage" :cost-usd="costUsd" :scope="scope" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** A reply's tokens with an estimated cost; the breakdown lists input, cached, output, reasoning. */
export const WithCost: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /42\.3K tokens/ }))
    const details = within(await within(document.body).findByTestId('chat-usage-meter-details'))
    await expect(details.getByText('Estimated cost')).toBeInTheDocument()
  }
}

/** A model with no listed price shows tokens only, never a guessed cost. */
export const TokensOnly: Story = {
  args: { costUsd: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /42\.3K tokens/ }))
    const details = within(await within(document.body).findByTestId('chat-usage-meter-details'))
    await expect(details.queryByText('Estimated cost')).not.toBeInTheDocument()
  }
}

/** The conversation's running total names the whole chat rather than one reply. */
export const ChatTotal: Story = {
  args: { scope: 'chat' }
}
