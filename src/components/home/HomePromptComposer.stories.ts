import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import HomePromptComposer from './HomePromptComposer.vue'

type Args = { modelValue: string; busy: boolean; onSubmit: (text: string) => void }

const meta = {
  title: 'App/Home/Prompt Composer',
  component: HomePromptComposer,
  args: { modelValue: '', busy: false, onSubmit: fn() },
  render: (args) => ({
    components: { HomePromptComposer },
    setup: () => ({ args, prompt: ref(args.modelValue) }),
    template:
      '<div class="bg-canvas p-4 text-surface"><HomePromptComposer v-model="prompt" :busy="args.busy" @submit="args.onSubmit" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

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
    const send = canvas.getByRole('button')
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
