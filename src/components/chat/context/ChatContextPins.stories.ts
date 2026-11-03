import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { toUint8Array } from 'js-base64'
import { expect, fn, userEvent, within } from 'storybook/test'

import type { ConversationPins } from '@/app/ai/chat/pins/types'
import type { PendingReference, PinFailure } from '@/app/ai/chat/pins/use'

import ChatContextPins from './ChatContextPins.vue'

/** A 1×1 PNG, so the thumbnail renders without fixtures. */
const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const pinned: ConversationPins = {
  styleKit: {
    name: 'Warm editorial',
    colors: [
      { name: 'Ink', hex: '#17171C' },
      { name: 'Paper', hex: '#FAF7F0' },
      { name: 'Accent', hex: '#FF5B2E' }
    ],
    fonts: ['Fraunces', 'Inter'],
    notes: 'Generous whitespace.'
  },
  references: []
}

type Args = {
  open: boolean
  pins: ConversationPins
  pending: PendingReference[]
  editable: boolean
  failure: PinFailure | null
  onEditStyleKit: () => void
}

const meta = {
  title: 'App/Chat/Pinned Context',
  tags: ['autodocs'],
  args: {
    open: true,
    pins: pinned,
    pending: [],
    editable: true,
    failure: null,
    onEditStyleKit: fn()
  },
  render: (args) => ({
    components: { ChatContextPins },
    setup: () => ({
      args,
      pins: {
        ...args.pins,
        references: args.pins.references.length
          ? args.pins.references
          : [
              {
                id: 'mood',
                name: 'moodboard.png',
                mediaType: 'image/png',
                image: new Blob([Uint8Array.from(toUint8Array(PIXEL))], { type: 'image/png' }),
                width: 8,
                height: 8,
                findings: 'Beige paper tones.'
              }
            ]
      }
    }),
    template:
      '<div class="flex h-[420px] w-80 justify-end bg-panel p-2"><ChatContextPins v-bind="args" :pins="pins" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Pinned: Story = {
  args: { open: false },
  play: async ({ canvasElement, args }) => {
    // The trigger names how much is pinned: the kit and one image.
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Pinned to this chat (2)' })
    )
    const pins = within(await within(document.body).findByTestId('chat-pins'))
    await expect(pins.getByText('Warm editorial')).toBeVisible()
    // Each swatch names its colour in text that screen readers announce.
    await expect(pins.getByText('Accent #FF5B2E')).toBeInTheDocument()
    await expect(pins.getByText('Fonts: Fraunces, Inter')).toBeVisible()
    await userEvent.click(pins.getByRole('button', { name: 'Edit style kit' }))
    await expect(args.onEditStyleKit).toHaveBeenCalledOnce()
  }
}

/** A reference the Vision model is still describing. */
export const Describing: Story = {
  args: { pending: [{ id: 'p', conversationId: 'c', name: 'hero-shot.jpg' }] }
}

export const Empty: Story = { args: { pins: { styleKit: null, references: [] } } }

/** Images need a Vision model; the alert offers the settings that set one up. */
export const VisionMissing: Story = { args: { failure: 'vision-unavailable' } }

/** Another document's conversation shows its pins without editing them. */
export const ReadOnly: Story = { args: { editable: false } }
