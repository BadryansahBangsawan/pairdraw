import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import Transport from './examples/Transport.vue'

const meta = {
  title: 'App/Editor/Shader Mode/Transport',
  component: Transport,
  parameters: {
    docs: {
      description: {
        component:
          "Shader Mode's transport: play or pause, back to the start, and a scrubber across the animation's loop with the time beside it. A shader that cannot play leaves every control disabled."
      }
    }
  }
} satisfies Meta<typeof Transport>

export default meta
type Story = StoryObj<typeof meta>

export const States: Story = {}

export const PlayPauseAndScrub: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [transport, unavailable] = canvas.getAllByRole('group', { name: 'Animation phase' })
    const controls = within(transport)

    await userEvent.click(controls.getByRole('button', { name: 'Pause' }))
    await expect(controls.getByRole('button', { name: 'Play' })).toBeVisible()

    const phase = controls.getByRole('slider', { name: 'Animation phase' })
    phase.focus()
    await userEvent.keyboard('{End}')
    await waitFor(() => expect(canvas.getByText('paused at 10.0, restarts 0')).toBeVisible())

    await userEvent.click(controls.getByRole('button', { name: 'Back to start' }))
    await waitFor(() => expect(canvas.getByText('paused at 0.0, restarts 1')).toBeVisible())

    await expect(within(unavailable).getByRole('button', { name: 'Play' })).toBeDisabled()
  }
}
