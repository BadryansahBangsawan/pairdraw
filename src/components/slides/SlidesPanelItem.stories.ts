import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import Deck from './examples/Deck.vue'

const meta = {
  title: 'App/Editor/Slides/Slides Panel Item',
  component: Deck,
  parameters: {
    docs: {
      description: {
        component:
          'A slide in the Slides panel: its number, thumbnail, and name. The slide the canvas has selected is ringed, a slide dragged over another shows where it lands, a double click presents from it, and Alt with an arrow moves it.'
      }
    }
  }
} satisfies Meta<typeof Deck>

export default meta
type Story = StoryObj<typeof meta>

export const States: Story = {}

export const SelectPresentAndMove: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const cover = canvas.getByRole('button', { name: 'Slide 1: Cover' })
    await userEvent.click(cover)
    await waitFor(() => expect(canvas.getByText('select Cover')).toBeVisible())
    await userEvent.dblClick(cover)
    await waitFor(() => expect(canvas.getByText('present Cover')).toBeVisible())
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}')
    await waitFor(() => expect(canvas.getByText('move Cover 1')).toBeVisible())
  }
}
