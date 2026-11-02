import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import ChatPromptExamples from './ChatPromptExamples.vue'

type Args = { disabled: boolean; onPick: (prompt: string) => void }

/** Draws the examples at a fixed width on a panel, as under the empty page's prompt card. */
function onPanel(width: string) {
  return (args: Args) => ({
    components: { ChatPromptExamples },
    setup: () => ({ args, width }),
    template: `
      <div :class="width" class="max-w-full rounded-card border border-border bg-panel p-4 text-surface">
        <ChatPromptExamples :disabled="args.disabled" @pick="args.onPick" />
      </div>`
  })
}

const meta = {
  title: 'App/Chat/Prompt Examples',
  component: ChatPromptExamples,
  args: { disabled: false, onPick: fn() },
  render: onPanel('w-[448px]')
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** In a narrow card, such as on a phone, the pills wrap onto more rows. */
export const Narrow: Story = { render: onPanel('w-[280px]') }

/** While a prompt is on its way, the examples wait too. */
export const Disabled: Story = { args: { disabled: true } }

/** Picking an example hands over its fuller prompt, not its short name. */
export const Picking: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const examples = canvas.getByRole('list')
    const buttons = within(examples).getAllByRole('button')
    await expect(buttons.length).toBeGreaterThan(1)

    const first = buttons[0]
    await userEvent.click(first)
    await expect(args.onPick).toHaveBeenCalledOnce()
    await expect(args.onPick).toHaveBeenCalledWith(expect.any(String))
    await expect(args.onPick).not.toHaveBeenCalledWith(first.textContent.trim())
  }
}
