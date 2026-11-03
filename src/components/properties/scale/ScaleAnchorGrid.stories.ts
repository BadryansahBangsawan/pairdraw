import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import { DEFAULT_SCALE_ANCHOR, type ScaleAnchor } from '@open-pencil/core'

import ScaleAnchorGrid from './ScaleAnchorGrid.vue'

const meta = {
  title: 'App/Editor/Properties/Scale Anchor',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "The Scale tool panel's anchor grid: the point of the selection that stays put while it scales."
      }
    }
  },
  args: { initial: DEFAULT_SCALE_ANCHOR },
  render: (args: { initial: ScaleAnchor }) => ({
    components: { ScaleAnchorGrid },
    setup() {
      const anchor = ref<ScaleAnchor>(args.initial)
      return { anchor }
    },
    template: `
      <div class="w-[240px] bg-panel p-4">
        <ScaleAnchorGrid v-model="anchor" />
      </div>`
  })
} satisfies Meta<{ initial: ScaleAnchor }>
export default meta
type Story = StoryObj<typeof meta>

export const TopLeft: Story = {}

export const Center: Story = { args: { initial: 'center' } }

export const PickAnchor: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const topLeft = canvas.getByRole('radio', { name: 'Top left' })
    await expect(topLeft).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(canvas.getByRole('radio', { name: 'Bottom right' }))
    await expect(canvas.getByRole('radio', { name: 'Bottom right' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    await expect(topLeft).toHaveAttribute('aria-checked', 'false')
  }
}
