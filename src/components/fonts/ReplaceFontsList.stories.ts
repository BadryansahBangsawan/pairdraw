import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import type { ReplaceFontRow } from './replace-fonts-rows'
import ReplaceFontsList from './ReplaceFontsList.vue'

const rows: ReplaceFontRow[] = [
  {
    font: { family: 'Helvetica Neue', style: 'Bold', missing: true, layerCount: 6 },
    selected: true,
    targetFamily: 'Inter',
    targetStyle: 'Bold'
  },
  {
    font: { family: 'Inter', style: 'Regular', missing: false, layerCount: 12 },
    selected: false,
    targetFamily: 'Inter',
    targetStyle: 'Regular'
  }
]

const meta = {
  title: 'Design System/Fonts/Replace Fonts',
  render: () => ({
    components: { ReplaceFontsList },
    setup: () => {
      const model = ref(rows.map((row) => ({ ...row })))
      const stylesFor = (family: string) =>
        family === 'Inter' ? ['Regular', 'Medium', 'Semi Bold', 'Bold'] : ['Regular', 'Bold']
      return { model, stylesFor }
    },
    template: `
      <div class="w-[46rem] max-w-full rounded-lg border border-border bg-panel p-2 text-surface">
        <ReplaceFontsList v-model="model" :styles-for="stylesFor" />
      </div>`
  })
} satisfies Meta<typeof ReplaceFontsList>

export default meta
type Story = StoryObj<typeof meta>

export const MissingFontSelected: Story = {}
