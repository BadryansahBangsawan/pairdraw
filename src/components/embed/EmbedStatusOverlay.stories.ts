import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'

import type { EmbedStatus } from '@/app/embed'

import EmbedStatusOverlay from './EmbedStatusOverlay.vue'

type Args = { status: EmbedStatus }

/**
 * The overlay covers the window in an embed; here a frame with `transform-gpu` stands in for the
 * window, so the fixed overlay fills the frame instead of the whole story.
 */
const meta = {
  title: 'App/Shell/Embed Status',
  component: EmbedStatusOverlay,
  args: { status: 'waiting' },
  render: (args) => ({
    components: { EmbedStatusOverlay },
    setup: () => ({ args }),
    template: `
      <div class="relative h-80 w-full max-w-2xl transform-gpu overflow-hidden rounded-card border border-border">
        <EmbedStatusOverlay :status="args.status" />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** Until the host page connects, the embed says it is waiting for it. */
export const Waiting: Story = {
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status')
    await expect(status).toHaveAttribute('data-status', 'waiting')
    await expect(within(status).getByRole('heading', { level: 1 })).toBeVisible()
  }
}

/** A link without a valid host origin can never connect, and says what the link needs. */
export const InvalidOrigin: Story = {
  args: { status: 'invalid-origin' },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status')
    await expect(status).toHaveAttribute('data-status', 'invalid-origin')
  }
}

/** Once the host connects the overlay is gone and the canvas shows. */
export const Connected: Story = {
  args: { status: 'connected' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('status')).toBeNull()
  }
}
