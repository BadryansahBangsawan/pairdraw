import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import { MATERIAL_SYMBOLS_OPTIONS, SF_SYMBOLS_OPTIONS, type IconOption } from '@pairdraw/core/icons'
import type { IconOptions } from '@pairdraw/scene-graph/icons'

import IconOptionControls from './IconOptionControls.vue'

function story(controls: readonly IconOption[], initial: IconOptions) {
  return () => ({
    components: { IconOptionControls },
    setup() {
      const values = ref<IconOptions>({ ...initial })
      function change(key: string, value: number | string) {
        values.value = { ...values.value, [key]: value }
      }
      return { controls, values, change }
    },
    template: `
      <div class="w-[240px] bg-panel p-4">
        <IconOptionControls :controls="controls" :values="values" @change="change" />
      </div>`
  })
}

const meta = {
  title: 'App/Editor/Properties/Icon Options',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "How a placed icon is drawn, for a set drawn with options: Material Symbols' weight, fill, grade, and optical size, or SF Symbols' weight, scale, and rendering."
      }
    }
  },
  render: story(MATERIAL_SYMBOLS_OPTIONS, { opsz: 24, wght: 400, FILL: 0, GRAD: 0 })
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const MaterialSymbols: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('spinbutton', { name: 'Weight' })).toHaveTextContent('400')
    await expect(canvas.getByRole('spinbutton', { name: 'Grade' })).toHaveTextContent('0')
    const fill = canvas.getByRole('switch', { name: 'Filled' })
    await expect(fill).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(fill)
    await expect(fill).toHaveAttribute('aria-checked', 'true')
  }
}

export const SFSymbols: Story = {
  render: story(SF_SYMBOLS_OPTIONS, {
    weight: 'semibold',
    scale: 'large',
    rendering: 'monochrome'
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('combobox', { name: 'Weight' })).toHaveTextContent('Semibold')
    await expect(canvas.getByRole('combobox', { name: 'Scale' })).toHaveTextContent('Large')
  }
}
