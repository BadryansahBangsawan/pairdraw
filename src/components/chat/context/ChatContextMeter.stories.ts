import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { contextMeter } from '@/app/ai/chat/context-window/meter'
import type { ContextUsage } from '@/app/ai/chat/context-window/usage'

import ChatContextMeter from './ChatContextMeter.vue'

type Args = { usage: ContextUsage | null; catalogWindow: number | null; pinnedTokens: number }

const meta = {
  title: 'App/Chat/Context Meter',
  tags: ['autodocs'],
  args: {
    usage: {
      usedTokens: 42_300,
      inputTokens: 40_100,
      cachedInputTokens: 31_000,
      outputTokens: 2200
    },
    catalogWindow: 200_000,
    pinnedTokens: 380
  },
  render: (args) => ({
    components: { ChatContextMeter },
    setup: () => ({ meter: contextMeter(args.usage, args.catalogWindow, args.pinnedTokens) }),
    template:
      '<div class="flex w-72 justify-end bg-panel p-2"><ChatContextMeter :meter="meter" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** A fifth of the window used; the breakdown lists tokens only, never a cost. */
export const Measured: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Context window, 21% used' }))
    const details = within(await within(document.body).findByTestId('chat-context-meter-details'))
    await waitFor(() => expect(details.getByText(/42.3K of 200K tokens/)).toBeVisible())
    await expect(details.getByText('Cached input')).toBeVisible()
  }
}

export const NearlyFull: Story = {
  args: { usage: { usedTokens: 188_000, windowTokens: 200_000 }, catalogWindow: null }
}

/** A custom model the catalog does not list: tokens without a share. */
export const UnknownWindow: Story = {
  args: { usage: { usedTokens: 12_400 }, catalogWindow: null, pinnedTokens: 0 }
}

/** A new conversation shows the model's window before any reply. */
export const NotMeasured: Story = { args: { usage: null, pinnedTokens: 0 } }
