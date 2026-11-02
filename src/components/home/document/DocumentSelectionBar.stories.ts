import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import IconClockFading from '~icons/lucide/clock-fading'
import IconFolderOpen from '~icons/lucide/folder-open'

import AppButton from '@/components/ui/button/AppButton.vue'

import DocumentSelectionBar from './DocumentSelectionBar.vue'

type Args = {
  count: number
  total: number
  onSelectAll: () => void
  onClear: () => void
}

/** The bar over Home's recent files while some are selected, with the actions Recent offers. */
const meta = {
  title: 'App/Home/Document Selection Bar',
  component: DocumentSelectionBar,
  args: { count: 2, total: 6, onSelectAll: fn(), onClear: fn() },
  render: (args: Args) => ({
    components: { DocumentSelectionBar, AppButton, IconClockFading, IconFolderOpen },
    setup: () => ({ args }),
    template: `
      <div class="@container/home w-[640px] max-w-full rounded-card border border-border bg-panel p-4 text-surface">
        <DocumentSelectionBar v-bind="args">
          <AppButton variant="outline">
            <template #leading><IconFolderOpen /></template>
            Open
          </AppButton>
          <AppButton variant="outline">
            <template #leading><IconClockFading /></template>
            Remove from Recents
          </AppButton>
        </DocumentSelectionBar>
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** With every listed document selected, Select all steps aside. */
export const AllSelected: Story = { args: { count: 6, total: 6 } }

/** In a phone-wide card the actions wrap under the count. */
export const Narrow: Story = {
  render: (args: Args) => ({
    components: { DocumentSelectionBar, AppButton, IconClockFading, IconFolderOpen },
    setup: () => ({ args }),
    template: `
      <div class="w-[340px] rounded-card border border-border bg-panel p-4 text-surface">
        <DocumentSelectionBar v-bind="args">
          <AppButton variant="outline">
            <template #leading><IconFolderOpen /></template>
            Open
          </AppButton>
          <AppButton variant="outline">
            <template #leading><IconClockFading /></template>
            Remove from Recents
          </AppButton>
        </DocumentSelectionBar>
      </div>`
  })
}
