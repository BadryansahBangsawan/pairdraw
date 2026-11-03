import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import type { StyleKit } from '@/app/ai/chat/pins/types'

import ChatContextStyleKitDialog from './ChatContextStyleKitDialog.vue'

const documentKit: StyleKit = {
  name: 'Landing styles',
  colors: [
    { name: 'Primary', hex: '#FF5B2E' },
    { name: 'Surface', hex: '#FFFFFF' }
  ],
  fonts: ['Inter'],
  notes: ''
}

type Args = { kit: StyleKit | null; onSave: (kit: StyleKit) => void }

const meta = {
  title: 'App/Chat/Style Kit Dialog',
  tags: ['autodocs'],
  args: { kit: null, onSave: fn() },
  render: (args) => ({
    components: { ChatContextStyleKitDialog },
    setup: () => ({ args, documentKit: () => documentKit }),
    template:
      '<div class="h-[560px]"><ChatContextStyleKitDialog v-bind="args" :open="true" :document-kit="documentKit" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** A new kit waits for content; the document's styles fill it in, and a colour is checked. */
export const New: Story = {
  play: async ({ args }) => {
    const dialog = within(await within(document.body).findByRole('dialog'))
    const save = dialog.getByRole('button', { name: 'Pin style kit' })
    await expect(save).toBeDisabled()
    await userEvent.type(dialog.getByRole('textbox', { name: 'Color value' }), 'nope{Enter}')
    await expect(dialog.getByRole('alert')).toHaveTextContent('Enter a CSS color')
    await userEvent.click(dialog.getByRole('button', { name: 'Use this document’s styles' }))
    await expect(dialog.getByText('Primary')).toBeVisible()
    await userEvent.click(save)
    await waitFor(() =>
      expect(args.onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Landing styles' }))
    )
  }
}

export const Editing: Story = {
  args: {
    kit: {
      name: 'Warm editorial',
      colors: [
        { name: 'Ink', hex: '#17171C' },
        { name: '', hex: '#FAF7F0' }
      ],
      fonts: ['Fraunces', 'Inter'],
      notes: 'Generous whitespace, 12px corner radius, warm photography.'
    }
  },
  /** The document's styles join the colours and fonts already in the kit. */
  play: async ({ args }) => {
    const dialog = within(await within(document.body).findByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: 'Use this document’s styles' }))
    await expect(dialog.getByText('Ink')).toBeVisible()
    await expect(dialog.getByText('Primary')).toBeVisible()
    await userEvent.click(dialog.getByRole('button', { name: 'Pin style kit' }))
    await waitFor(() =>
      expect(args.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Warm editorial',
          colors: [
            { name: 'Ink', hex: '#17171C' },
            { name: '', hex: '#FAF7F0' },
            { name: 'Primary', hex: '#FF5B2E' },
            { name: 'Surface', hex: '#FFFFFF' }
          ],
          fonts: ['Fraunces', 'Inter']
        })
      )
    )
  }
}
