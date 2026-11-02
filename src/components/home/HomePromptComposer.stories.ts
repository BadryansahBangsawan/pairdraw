import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import HomePromptComposer from './HomePromptComposer.vue'

type Args = { modelValue: string; busy: boolean; onSubmit: (text: string) => void }

/**
 * Draws the composer at the top of Home's documents card at a fixed width. The card is the `home`
 * container the composer sizes its heading and spacing by.
 */
function inDocumentsCard(width: string) {
  return (args: Args) => ({
    components: { HomePromptComposer },
    setup: () => ({ args, width, prompt: ref(args.modelValue) }),
    template: `
      <div :class="width" class="@container/home max-w-full rounded-card border border-border bg-panel text-surface">
        <div class="p-4">
          <HomePromptComposer v-model="prompt" :busy="args.busy" @submit="args.onSubmit" />
        </div>
      </div>`
  })
}

const meta = {
  title: 'App/Home/Prompt Composer',
  component: HomePromptComposer,
  args: { modelValue: '', busy: false, onSubmit: fn() },
  render: inDocumentsCard('w-[720px]')
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** From a 42rem card the heading is larger, with more room above and below. */
export const Empty: Story = {}

/** In a narrow card, such as on a phone, the heading is smaller and closer to the field. */
export const Narrow: Story = { render: inDocumentsCard('w-[360px]') }

export const Written: Story = {
  args: { modelValue: 'A sign-in screen for a banking app with a passkey option' }
}

export const Waiting: Story = {
  args: { modelValue: 'A pricing section with three plans', busy: true }
}

/** Enter sends what was written and Shift+Enter starts a new line; an empty field sends nothing. */
export const Sending: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole('textbox')
    const send = canvas.getByRole('button', { name: 'Send message' })
    await expect(send).toBeDisabled()
    await userEvent.type(field, '{Enter}')
    await expect(args.onSubmit).not.toHaveBeenCalled()

    await userEvent.type(field, 'A pricing page{Shift>}{Enter}{/Shift}with three plans')
    await expect(field).toHaveValue('A pricing page\nwith three plans')
    await expect(args.onSubmit).not.toHaveBeenCalled()
    await expect(send).toBeEnabled()

    await userEvent.type(field, '{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledOnce()
    await expect(args.onSubmit).toHaveBeenCalledWith('A pricing page\nwith three plans')
  }
}

/** Picking an example writes its prompt into the field to edit, and sends nothing yet. */
export const PickingExample: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole('textbox')
    const examples = within(canvas.getByRole('list')).getAllByRole('button')
    await userEvent.click(examples[0])
    await expect(field).not.toHaveValue('')
    await expect(field).toHaveFocus()
    await expect(args.onSubmit).not.toHaveBeenCalled()
  }
}
