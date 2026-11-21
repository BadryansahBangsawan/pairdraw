import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { defineComponent, ref } from 'vue'

import { createEditor } from '@pairdraw/core/editor'
import type { Fill } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'
import { provideEditor } from '@pairdraw/vue/editor/context'

import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel.vue'

/** A picker over an editor whose page uses red twice and blue once. */
const Harness = defineComponent({
  components: { ColorPickerPanel },
  setup() {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const solid = (color: Color): Fill => ({
      type: 'SOLID',
      color,
      opacity: 1,
      visible: true
    })
    const RED: Color = { r: 1, g: 0, b: 0, a: 1 }
    const BLUE: Color = { r: 0, g: 0, b: 1, a: 1 }
    for (const color of [RED, RED, BLUE]) {
      editor.graph.createNode('RECTANGLE', pageId, { fills: [solid(color)] })
    }
    provideEditor(editor)
    const color = ref({ r: 0, g: 1, b: 0, a: 1 })
    return { color }
  },
  template: `
    <div class="w-56">
      <ColorPickerPanel :color="color" @update="color = $event" />
      <output data-test-id="picked">{{ color.r }},{{ color.g }},{{ color.b }}</output>
    </div>
  `
})

const meta = {
  title: 'App/Editor/Properties/Document Colors',
  component: Harness,
  parameters: {
    docs: {
      description: {
        component:
          'The picker lists the solid colours the page uses, most used first; picking one applies it to the paint being edited.'
      }
    }
  }
} satisfies Meta<typeof Harness>

export default meta
type Story = StoryObj<typeof meta>

export const PageColors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const swatches = canvas.getAllByRole('button', { name: /^rgb\(/ })
    await expect(swatches).toHaveLength(2)
    await expect(canvas.getByText('Document colors')).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: 'rgb(0, 0, 255)' }))
    await expect(canvas.getByTestId('picked')).toHaveTextContent('0,0,1')
  }
}
