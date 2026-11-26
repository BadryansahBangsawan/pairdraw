import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { toUint8Array } from 'js-base64'
import { expect, fn, userEvent, within } from 'storybook/test'
import { onUnmounted } from 'vue'

import {
  freeTurnRenders,
  setTurnRenders,
  type TurnRenders
} from '@/app/ai/tools/changes/turn-store'

import ChatTurnRenders from './ChatTurnRenders.vue'

const BEFORE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAGAAAAA4CAYAAAACRf2iAAAAgklEQVR42u3bsQkAIAxE0ewquH8KCysdQUgThFf8Be7VF7n2UV9hBAAABACAAAAQAAACAODVmPltAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8BFz0hMAAAIAQAAACAAAVburId+HNheO5AAAAABJRU5ErkJggg=='
const AFTER_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAGAAAAA4CAYAAAACRf2iAAAAgUlEQVR42u3bMREAIAwEwUjAMrIii4KCCmRkwmxxBn7rj7XPVV1hBAAABACAAAAQAAACAKC6kbNtAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkJMeAAEAIAAABACAAPzbA4wnD7kKs8uLAAAAAElFTkSuQmCC'

function png(base64: string): Blob {
  return new Blob([new Uint8Array(toUint8Array(base64))], { type: 'image/png' })
}

const ready: TurnRenders = {
  status: 'ready',
  changed: 5,
  frames: [
    {
      frameId: '12:4',
      pageId: '0:1',
      name: 'Hero',
      before: png(BEFORE_PNG),
      after: png(AFTER_PNG),
      widths: [
        { width: 375, blob: png(AFTER_PNG) },
        { width: 768, blob: png(AFTER_PNG) }
      ],
      created: false,
      deleted: false
    },
    {
      frameId: '12:9',
      pageId: '0:1',
      name: 'Pricing',
      before: null,
      after: png(AFTER_PNG),
      widths: [],
      created: true,
      deleted: false
    },
    {
      frameId: '12:7',
      pageId: '0:1',
      name: 'Nav',
      before: png(BEFORE_PNG),
      after: null,
      widths: [],
      created: false,
      deleted: true
    }
  ]
}

const summaries = ready.frames.map(({ frameId, pageId, name }) => ({ frameId, pageId, name }))
const rendering: TurnRenders = { status: 'rendering', frames: summaries, changed: 5 }
const cleared: TurnRenders = { status: 'cleared', frames: summaries, changed: 5 }
const unavailable: TurnRenders = { status: 'unavailable', frames: summaries, changed: 2 }

interface Args {
  renders: TurnRenders
  onReveal: (frameId: string) => void
}

const meta = {
  title: 'App/Chat/Turn Renders',
  args: { renders: ready, onReveal: fn() },
  parameters: { layout: 'centered' },
  render: (args) => ({
    components: { ChatTurnRenders },
    setup() {
      const owner = { onDispose: () => () => {} }
      const messageId = 'story-turn-renders'
      setTurnRenders(owner, messageId, args.renders)
      onUnmounted(() => freeTurnRenders(messageId))
      return { args, messageId }
    },
    template:
      '<div class="w-80 bg-panel p-3"><ChatTurnRenders :message-id="messageId" @reveal="args.onReveal" /></div>'
  })
} satisfies Meta<Args>
export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('heading', { name: 'Changed frames' })).toBeTruthy()
    await expect(canvas.getByText('New frame')).toBeTruthy()
    await expect(canvas.getByText('Deleted')).toBeTruthy()
    await expect(canvas.getByText('+2 more frames')).toBeTruthy()
    await expect(canvas.getByRole('button', { name: '375px wide' })).toBeTruthy()
    await expect(canvas.getByRole('button', { name: 'Show Nav on canvas' })).toBeDisabled()
    await userEvent.click(canvas.getByRole('button', { name: 'Show Hero on canvas' }))
    await expect(args.onReveal).toHaveBeenCalledWith('12:4')
  }
}

export const Rendering: Story = {
  args: { renders: rendering },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status').textContent).toContain('Rendering changes')
  }
}

export const Cleared: Story = {
  args: { renders: cleared },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/Renders cleared to save memory/)).toBeTruthy()
    await expect(canvas.getByText(/5 frames changed/)).toBeTruthy()
  }
}

export const Unavailable: Story = {
  args: { renders: unavailable },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/Renders are unavailable here/)).toBeTruthy()
  }
}
