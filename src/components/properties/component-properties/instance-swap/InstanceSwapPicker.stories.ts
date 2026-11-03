import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import InstanceSwapPicker from './examples/Picker.vue'

const meta = {
  title: 'App/Editor/Properties/Instance Swap',
  component: InstanceSwapPicker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The instance header’s swap: any component the document has, the current one checked and ones that would contain themselves disabled.'
      }
    }
  }
} satisfies Meta<typeof InstanceSwapPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const Swap: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole('button', { name: 'Swap instance' }))
    await waitFor(() => expect(page.getByRole('option', { name: /Card/ })).toBeVisible())
    await expect(page.getByRole('option', { name: /Card/ })).toHaveAttribute('data-disabled')
    await userEvent.click(page.getByRole('option', { name: /Icon \/ Star/ }))
    await waitFor(() => expect(canvas.getByText('icon-star')).toBeVisible())
  }
}

/** An instance the document cannot change, such as one inside a library's component. */
export const Disabled: Story = {
  render: () => ({
    components: { InstanceSwapPicker },
    template: '<InstanceSwapPicker disabled />'
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Swap instance' })).toBeDisabled()
  }
}
