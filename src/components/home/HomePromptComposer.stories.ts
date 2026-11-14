import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import type { CreationKindId } from '@/app/home/creation'

import HomePromptComposer from './HomePromptComposer.vue'

type Args = {
  modelValue: string
  kind: CreationKindId
  busy: boolean
  onSubmit: (text: string) => void
}

/**
 * Draws the composer at the top of Home's documents card at a fixed width. The card is the `home`
 * container the composer sizes its heading and spacing by.
 */
function inDocumentsCard(width: string) {
  return (args: Args) => ({
    components: { HomePromptComposer },
    setup: () => ({ args, width, prompt: ref(args.modelValue), kind: ref(args.kind) }),
    template: `
      <div :class="width" class="@container/home max-w-full rounded-card border border-border bg-panel text-surface">
        <div class="p-4">
          <HomePromptComposer v-model="prompt" v-model:kind="kind" :busy="args.busy" @submit="args.onSubmit" />
          <output data-test-id="chosen-kind" class="sr-only">{{ kind }}</output>
        </div>
      </div>`
  })
}

const meta = {
  title: 'App/Home/Prompt Composer',
  component: HomePromptComposer,
  args: { modelValue: '', kind: 'landing', busy: false, onSubmit: fn() },
  render: inDocumentsCard('w-[720px]')
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** The kinds of design sit over the field, the chosen one raised. */
export const Empty: Story = {}

/** In a narrow card, such as on a phone, the kinds wrap onto more rows. */
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

/** Choosing a kind changes what the prompt will make and moves to the field; it sends nothing. */
export const ChoosingKind: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole('textbox')
    const landing = canvas.getByRole('button', { name: 'Landing page' })
    const mobile = canvas.getByRole('button', { name: 'Mobile app' })
    await expect(landing).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(mobile)
    await expect(mobile).toHaveAttribute('aria-pressed', 'true')
    await expect(landing).toHaveAttribute('aria-pressed', 'false')
    await expect(canvas.getByTestId('chosen-kind')).toHaveTextContent('mobile')
    await expect(field).toHaveFocus()
    await expect(args.onSubmit).not.toHaveBeenCalled()
  }
}
