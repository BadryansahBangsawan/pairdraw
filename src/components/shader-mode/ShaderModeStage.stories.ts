import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, waitFor, within } from 'storybook/test'

import type { StoryShaderState } from './examples/backend'
import Stage from './examples/Stage.vue'

type Args = { width: number; state: StoryShaderState; readOnly: boolean }

/** The transport's play or pause button, whichever it shows as animations are on or off. */
async function playButton(canvasElement: HTMLElement) {
  const transport = await within(canvasElement).findByRole('group', { name: 'Animation phase' })
  const button = within(transport).getAllByRole('button').at(0)
  if (!button) throw new Error('The transport has no play button')
  return button
}

const meta = {
  title: 'App/Editor/Shader Mode/Stage',
  args: { width: 960, state: 'ready', readOnly: false },
  argTypes: {
    state: { control: 'select', options: ['ready', 'starting', 'failed', 'unsupported'] }
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          "Shader Mode shows one shader large, with its transport below and its settings beside it, or below it in a narrow stage. A shader that cannot play shows its paint's still frame and says why, and a read-only document's shader can be watched but not tuned."
      }
    }
  },
  render: (args) => ({
    components: { Stage },
    setup: () => ({ args }),
    // Each state starts its own document and backend.
    template: '<Stage :key="args.state + String(args.readOnly)" v-bind="args" />'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** Wide enough for the settings beside the preview. */
export const Wide: Story = {
  play: async ({ canvasElement }) => {
    const button = await playButton(canvasElement)
    await waitFor(() => expect(button).toBeEnabled())
    await expect(
      within(canvasElement).getByRole('complementary', { name: 'Shader settings' })
    ).toBeVisible()
  }
}

/** A narrow stage puts the settings below the preview. */
export const Narrow: Story = { args: { width: 420 } }

export const Starting: Story = { args: { state: 'starting' } }

/** The shader failed to start: its still shows, and the transport has nothing to control. */
export const Failed: Story = {
  args: { state: 'failed' },
  play: async ({ canvasElement }) => {
    // The shader starts before it fails, so the transport turns off once the failure is known.
    await waitFor(async () => expect(await playButton(canvasElement)).toBeDisabled())
    await expect(
      within(canvasElement).getByText(
        'This shader could not play here, so its still frame is shown.'
      )
    ).toBeVisible()
  }
}

/** Without WebGPU the still shows, with a note that shaders need it. */
export const Unsupported: Story = { args: { state: 'unsupported' } }

export const UnsupportedNarrow: Story = { args: { state: 'unsupported', width: 420 } }

/** A read-only document's shader plays, and its settings say they cannot change. */
export const ReadOnly: Story = { args: { readOnly: true } }
