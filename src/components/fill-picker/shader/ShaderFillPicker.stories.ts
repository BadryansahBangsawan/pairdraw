import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { ref } from 'vue'

import { DEFAULT_SHADER_PRESET } from '@open-pencil/vue/controls/shader'

import ShaderFillPicker from './ShaderFillPicker.vue'

const meta = {
  title: 'App/Editor/Properties/Shader Fill Picker',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Edits a shader paint: its stack of effects, a gallery of complete shaders, and the preset's JSON. A paint that just became a shader opens on the gallery."
      }
    }
  },
  render: () => ({
    components: { ShaderFillPicker },
    setup() {
      const preset = ref(structuredClone(DEFAULT_SHADER_PRESET))
      return { preset }
    },
    template: `
      <div class="w-[240px] bg-panel p-2">
        <ShaderFillPicker :preset="preset" @update="preset = $event" />
      </div>`
  })
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

/** A new shader paint, which opens on the gallery. */
export const NewShader: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('radiogroup', { name: 'Preset gallery' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Preset gallery' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  }
}

/** A shader of its own opens on its effects; the gallery is a toggle away. */
export const EditedShader: Story = {
  render: () => ({
    components: { ShaderFillPicker },
    setup() {
      const preset = ref({ components: [{ type: 'Aurora' }, { type: 'FilmGrain' }] })
      return { preset }
    },
    template: `
      <div class="w-[240px] bg-panel p-2">
        <ShaderFillPicker :preset="preset" @update="preset = $event" />
      </div>`
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('shader-effects')).toBeVisible()
    await expect(canvas.queryByRole('radiogroup', { name: 'Preset gallery' })).toBeNull()
  }
}

/** Applying a gallery shader replaces the stack, which the effects list then shows. */
export const ApplyFromGallery: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: 'Retro screen' }))
    await expect(canvas.getByRole('radio', { name: 'Retro screen' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Preset gallery' }))
    await waitFor(() =>
      expect(
        [...canvasElement.querySelectorAll('[data-shader-effect]')].map((row) =>
          row.getAttribute('data-shader-effect')
        )
      ).toEqual(['CRTScreen', 'Plasma'])
    )
  }
}
