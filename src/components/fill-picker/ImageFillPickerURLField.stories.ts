import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import ImageFillPickerURLField from './ImageFillPickerURLField.vue'

const meta = {
  title: 'App/Editor/Properties/Image Fill URL',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "The image fill picker's address field: an image URL typed or pasted, loaded when it is submitted, with the reason when it gave no image."
      }
    }
  },
  render: () => ({
    components: { ImageFillPickerURLField },
    setup() {
      const submitted = ref('')
      return { submitted }
    },
    template: `
      <div class="w-[240px] bg-panel p-4">
        <ImageFillPickerURLField @submit="submitted = $event" />
        <p data-test-id="submitted" class="mt-2 text-xs text-muted">{{ submitted }}</p>
      </div>`
  })
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Submit: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const load = canvas.getByRole('button', { name: 'Load' })
    await expect(load).toBeDisabled()
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Image URL' }),
      ' https://images.example/photo.png '
    )
    await userEvent.click(load)
    await expect(canvas.getByTestId('submitted')).toHaveTextContent(
      'https://images.example/photo.png'
    )
  }
}

export const Loading: Story = {
  render: () => ({
    components: { ImageFillPickerURLField },
    template: `
      <div class="w-[240px] bg-panel p-4">
        <ImageFillPickerURLField pending />
      </div>`
  })
}

export const Failed: Story = {
  render: () => ({
    components: { ImageFillPickerURLField },
    template: `
      <div class="w-[240px] bg-panel p-4">
        <ImageFillPickerURLField error="That address answered 404, so no image was loaded." />
      </div>`
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('textbox', { name: 'Image URL' })).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    await expect(canvas.getByRole('alert')).toBeVisible()
  }
}
