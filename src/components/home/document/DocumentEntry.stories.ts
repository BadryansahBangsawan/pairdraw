import type { Meta, StoryObj } from '@storybook/vue3-vite'
import IconLibraryBig from '~icons/lucide/library-big'

import DocumentEntry from './DocumentEntry.vue'
import type { DocumentEntryMenu } from './types'

type Args = {
  name: string
  metadata: string
  view: 'grid' | 'list'
  disabled?: boolean
  menu?: DocumentEntryMenu
  selectable?: boolean
  selected?: boolean
  label?: string
  /** Draws the library icon in place of a preview, as Home's design systems do. */
  designSystem?: boolean
}

/**
 * Draws the entry in Home's documents card at a fixed width. The card is the `home` container the
 * entry lays itself out by; a list row sits in the list's frame, as on Home.
 */
function inDocumentsCard(width: string) {
  return (args: Args) => ({
    components: { DocumentEntry, IconLibraryBig },
    setup: () => ({ args, width }),
    template: `
      <div :class="width" class="@container/home max-w-full rounded-card border border-border bg-panel text-surface">
        <div class="p-4">
          <div v-if="args.view === 'list'" class="overflow-hidden rounded-xl border border-border">
            <DocumentEntry v-bind="args">
              <template v-if="args.designSystem" #icon><IconLibraryBig class="size-4 shrink-0 text-muted" /></template>
            </DocumentEntry>
          </div>
          <DocumentEntry v-else v-bind="args">
            <template v-if="args.designSystem" #fallback><IconLibraryBig class="size-8 text-muted/50" /></template>
          </DocumentEntry>
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

/** A stored document's menu: select it, save a copy, or delete it. */
const menu: DocumentEntryMenu = {
  actions: 'Actions for Design system',
  items: [
    { action: 'select', label: 'Select' },
    { action: 'save-as', label: 'Save As…' },
    { action: 'delete', label: 'Delete' }
  ]
}

/** A recent file's menu, while it is selected: deselect it, save a copy, or forget it. */
const recentMenu: DocumentEntryMenu = {
  actions: 'Actions for Design system',
  items: [
    { action: 'deselect', label: 'Deselect' },
    { action: 'save-as', label: 'Save As…' },
    { action: 'remove-recent', label: 'Remove from Recents' }
  ]
}

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

/** Picked with Cmd/Ctrl+click: an accent ring and a check on the card. */
export const Selected: Story = {
  args: { menu: recentMenu, selectable: true, selected: true }
}

/** A picked row takes the selected-row tint and a check in place of its file icon. */
export const ListSelected: Story = {
  args: { view: 'list', menu: recentMenu, selectable: true, selected: true },
  render: inDocumentsCard('w-[720px]')
}

/** A design system: no preview, and opening it starts a new design with its library. */
export const DesignSystem: Story = {
  args: {
    name: 'Acme UI',
    metadata: '48 components · 2 days ago',
    label: 'New design with Acme UI',
    designSystem: true
  }
}

export const DesignSystemRow: Story = {
  args: { ...DesignSystem.args, view: 'list' },
  render: inDocumentsCard('w-[720px]')
}
