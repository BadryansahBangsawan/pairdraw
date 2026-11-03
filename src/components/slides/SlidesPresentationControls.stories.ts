import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import Controls from './examples/Controls.vue'

const meta = {
  title: 'App/Editor/Slides/Presentation Controls',
  component: Controls,
  parameters: {
    docs: {
      description: {
        component:
          "The presentation's controls: previous and next slide with the slide's place between them, fitted or 100%, and the way out. They fade while the pointer rests and come back as it moves or a control takes focus."
      }
    }
  }
} satisfies Meta<typeof Controls>

export default meta
type Story = StoryObj<typeof meta>

export const States: Story = {}

export const StepScaleAndExit: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [controls] = canvas.getAllByRole('toolbar', { name: 'Presentation' })
    const bar = within(controls)
    await expect(bar.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
    await userEvent.click(bar.getByRole('button', { name: 'Next slide' }))
    await userEvent.click(bar.getByRole('button', { name: 'Actual size' }))
    await userEvent.click(bar.getByRole('button', { name: /Exit presentation/ }))
    await waitFor(() => expect(canvas.getByText('slide 2, actual, exits 1')).toBeVisible())
    await expect(bar.getByText('2 of 4')).toBeVisible()
  }
}

export const FocusWhileIdle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [stepping, resting] = canvas.getAllByRole('toolbar', { name: 'Presentation' })
    // Resting controls fade out, unless one of them has focus.
    await expect(resting).toHaveAttribute('data-idle')
    await waitFor(() => expect(getComputedStyle(resting).opacity).toBe('0'))
    within(resting)
      .getByRole('button', { name: /Exit presentation/ })
      .focus()
    await waitFor(() => expect(getComputedStyle(resting).opacity).toBe('1'))
    await expect(getComputedStyle(resting).pointerEvents).not.toBe('none')

    // Next turns off on the last slide and hands focus to Previous.
    const next = within(stepping).getByRole('button', { name: 'Next slide' })
    await userEvent.click(next)
    await userEvent.click(next)
    await userEvent.click(next)
    await expect(next).toBeDisabled()
    await waitFor(() =>
      expect(within(stepping).getByRole('button', { name: 'Previous slide' })).toHaveFocus()
    )
  }
}
