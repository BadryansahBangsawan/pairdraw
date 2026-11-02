import type { Meta, StoryObj } from '@storybook/vue3-vite'

import DocumentEntry from './DocumentEntry.vue'

type Args = {
  name: string
  metadata: string
  view: 'grid' | 'list'
  disabled?: boolean
  menu?: { actions: string; delete: string }
}

/**
 * Draws the entry in Home's documents card at a fixed width. The card is the `home` container the
 * entry lays itself out by; a list row sits in the list's frame, as on Home.
 */
function inDocumentsCard(width: string) {
  return (args: Args) => ({
    components: { DocumentEntry },
    setup: () => ({ args, width }),
    template: `
      <div :class="width" class="@container/home max-w-full rounded-card border border-border bg-panel text-surface">
        <div class="p-4">
          <div v-if="args.view === 'list'" class="overflow-hidden rounded-xl border border-border">
            <DocumentEntry v-bind="args" />
          </div>
          <DocumentEntry v-else v-bind="args" />
        </div>
      </div>`
  })
}

const meta = {
  title: 'App/Home/Document Entry',
  component: DocumentEntry,
  args: { name: 'Design system', metadata: 'Sep 7, 2026', view: 'grid' },
  render: inDocumentsCard('w-[320px]')
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>
const menu = { actions: 'Actions for Design system', delete: 'Delete' }

export const Default: Story = {}

/** In a narrow card a row is taller, with the date under the name. */
export const List: Story = { args: { view: 'list' } }

/** From a 28rem card a row is shorter and roomier, with the date in its own trailing column. */
export const ListWide: Story = {
  args: { view: 'list', menu },
  render: inDocumentsCard('w-[720px]')
}

export const LongName: Story = {
  args: { name: 'A deliberately long document name that must stay inside the document card' }
}
export const Disabled: Story = { args: { disabled: true } }
export const WithMenu: Story = { args: { menu } }
export const ListWithMenu: Story = { args: { view: 'list', menu } }
