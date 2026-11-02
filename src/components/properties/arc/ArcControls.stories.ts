import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'
import { ref } from 'vue'

import type { ArcField } from '@open-pencil/core/geometry'
import { MIXED } from '@open-pencil/vue/controls/node-props'

import ArcControls from './ArcControls.vue'

const meta = {
  title: 'App/Editor/Properties/Arc',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "A selected ellipse's arc as numbers beside its handles: start in degrees, sweep in percent of a turn, and inner ratio in percent of the radius."
      }
    }
  },
  render: () => ({
    components: { ArcControls },
    setup() {
      const arc = ref({ start: 45, sweep: 75, ratio: 40 })
      function set(field: ArcField, value: number) {
        arc.value = { ...arc.value, [field]: value }
      }
      return { arc, set }
    },
    template: `
      <div class="w-[240px] bg-panel p-4">
        <ArcControls
          :start="arc.start"
          :sweep="arc.sweep"
          :ratio="arc.ratio"
          @update="set"
          @commit="set"
        />
      </div>`
  })
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole('group', { name: 'Arc' })
    await expect(within(group).getByRole('spinbutton', { name: 'Start' })).toHaveTextContent('45')
    await expect(within(group).getByRole('spinbutton', { name: 'Sweep' })).toHaveTextContent('75')
    await expect(within(group).getByRole('spinbutton', { name: 'Ratio' })).toHaveTextContent('40')
  }
}

/** Ellipses selected together that start at different angles show the start as mixed. */
export const Mixed: Story = {
  render: () => ({
    components: { ArcControls },
    setup: () => ({ mixed: MIXED }),
    template: `
      <div class="w-[240px] bg-panel p-4">
        <ArcControls :start="mixed" :sweep="100" :ratio="0" />
      </div>`
  })
}
