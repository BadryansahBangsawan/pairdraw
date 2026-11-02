import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import HTMLExportFields from './HTMLExportFields.vue'

type Args = {
  showStyling: boolean
  html: 'fragment' | 'standalone'
  style: 'inline' | 'tailwind'
  assets: 'inline' | 'external'
  layerNames: boolean
  layerIds: boolean
}

const meta = {
  title: 'App/Export/HTML Export Fields',
  tags: ['autodocs'],
  args: {
    showStyling: true,
    html: 'standalone',
    style: 'inline',
    assets: 'inline',
    layerNames: true,
    layerIds: false
  },
  render: (args) => ({
    components: { HTMLExportFields },
    setup: () => {
      const settings = ref({
        html: args.html,
        style: args.style,
        assets: args.assets,
        layerNames: args.layerNames,
        layerIds: args.layerIds
      })
      return { args, settings }
    },
    template: `
      <div class="w-72 rounded-xl border border-border bg-panel p-3">
        <HTMLExportFields v-model="settings" :show-styling="args.showStyling" />
        <output
          class="sr-only"
          :data-html="settings.html"
          :data-assets="settings.assets"
          :data-layer-names="settings.layerNames"
          :data-layer-ids="settings.layerIds"
        />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** The defaults: a whole page with embedded images, layer names on and IDs off. */
export const Default: Story = {}

/** A fragment with Tailwind classes, separate image files, and every layer attribute. */
export const FragmentWithFiles: Story = {
  args: { html: 'fragment', style: 'tailwind', assets: 'external', layerIds: true }
}

/** In the Code panel, which chooses the styling itself. */
export const WithoutStyling: Story = {
  args: { showStyling: false }
}

/** Each control changes the one setting it names. */
export const ChangesSettings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const switches = canvas.getAllByRole('switch')
    const scaffold = switches.at(0)
    const layerIds = switches.at(2)
    if (!scaffold || !layerIds) throw new Error('Expected the switches')
    await userEvent.click(scaffold)
    await userEvent.click(layerIds)
    await userEvent.click(canvas.getByText('Separate files'))
    const output = canvasElement.querySelector('output')
    await expect(output).toHaveAttribute('data-html', 'fragment')
    await expect(output).toHaveAttribute('data-assets', 'external')
    await expect(output).toHaveAttribute('data-layer-ids', 'true')
    await expect(output).toHaveAttribute('data-layer-names', 'true')
  }
}
