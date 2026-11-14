import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { ref } from 'vue'

import { DEFAULT_SHADER_PRESET, SHADER_GALLERY } from '@pairdraw/vue/controls/shader'

import ShaderFillPickerGallery from './ShaderFillPickerGallery.vue'

const sunset = SHADER_GALLERY.find((entry) => entry.id === 'sunset')?.preset

const meta = {
  title: 'App/Editor/Properties/Shader Gallery',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "The shader fill picker's gallery: complete shaders of several effects, each applied in one click. The tiles form a radio group with arrow-key navigation; the tile of the shader the paint draws is checked. Where shaders cannot be drawn, each tile shows its palette."
      }
    }
  },
  render: () => ({
    components: { ShaderFillPickerGallery },
    setup() {
      const preset = ref(structuredClone(DEFAULT_SHADER_PRESET))
      return { preset }
    },
    template: `
      <div class="w-[240px] bg-panel p-2">
        <ShaderFillPickerGallery :preset="preset" @apply="preset = $event" />
      </div>`
  })
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

/** A paint that draws a shader of its own: no tile is checked. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('radiogroup', { name: 'Preset gallery' })).toBeVisible()
    const tiles = canvas.getAllByRole('radio')
    await expect(tiles).toHaveLength(SHADER_GALLERY.length)
    for (const tile of tiles) await expect(tile).toHaveAttribute('aria-checked', 'false')
  }
}

/** A paint that draws a gallery shader as the gallery has it. */
export const Applied: Story = {
  render: () => ({
    components: { ShaderFillPickerGallery },
    setup() {
      return { preset: sunset }
    },
    template: `
      <div class="w-[240px] bg-panel p-2">
        <ShaderFillPickerGallery :preset="preset" />
      </div>`
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('radio', { name: 'Sunset' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  }
}

/** One click applies a shader, which the gallery then checks; arrow keys move to the next. */
export const ApplyShader: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const orb = canvas.getByRole('radio', { name: 'Glass orb' })
    await userEvent.click(orb)
    await waitFor(() => expect(orb).toHaveAttribute('aria-checked', 'true'))
    await waitFor(() => expect(orb).toHaveFocus())
    // A press that outlasts a task turn, as a person's does: the gallery checks the tile the
    // arrow keys focus once the key is still down when that focus lands.
    await userEvent.keyboard('[ArrowRight>]')
    await userEvent.keyboard('[/ArrowRight]')
    const marble = canvas.getByRole('radio', { name: 'Marble' })
    await waitFor(() => expect(marble).toHaveAttribute('aria-checked', 'true'))
    await expect(orb).toHaveAttribute('aria-checked', 'false')
  }
}
