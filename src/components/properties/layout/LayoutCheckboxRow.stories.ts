import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import LayoutCheckboxRow from './LayoutCheckboxRow.vue'

type State = boolean | 'indeterminate'

function renderRow(initial: State) {
  return () => ({
    components: { LayoutCheckboxRow },
    setup() {
      const state = ref<State>(initial)
      const toggle = () => {
        state.value = state.value !== true
      }
      return { state, toggle }
    },
    template: `
      <div class="w-[240px] bg-panel p-4">
        <LayoutCheckboxRow :model-value="state" label="Include strokes in layout" @toggle="toggle" />
      </div>`
  })
}

const meta = {
  title: 'App/Editor/Properties/Layout Checkbox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A layout section option such as Clip content or Include strokes in layout; a selection whose frames differ shows it mixed.'
      }
    }
  },
  render: renderRow(false)
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Unchecked: Story = {}

export const Mixed: Story = {
  render: renderRow('indeterminate'),
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole('checkbox', {
      name: 'Include strokes in layout'
    })
    await expect(checkbox).toHaveAttribute('aria-checked', 'mixed')
    await userEvent.click(checkbox)
    await expect(checkbox).toHaveAttribute('aria-checked', 'true')
  }
}

export const ToggleFromLabel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('Include strokes in layout'))
    await expect(
      canvas.getByRole('checkbox', { name: 'Include strokes in layout' })
    ).toHaveAttribute('aria-checked', 'true')
  }
}
