import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import type { ClipboardImportPlan } from '@pairdraw/core'

import ClipboardImportDialog from './ClipboardImportDialog.vue'

type Args = { plan: ClipboardImportPlan; onAnswer: (choice: unknown) => void }

const NOTHING_HERE: ClipboardImportPlan = {
  collections: [
    { id: 'source:spacing', name: 'Spacing', variableCount: 6, existing: null },
    { id: 'source:brand', name: 'Brand', variableCount: 1, existing: null }
  ],
  styles: [{ id: 'source:heading', name: 'Heading/Large', type: 'TEXT', existing: null }]
}

const CONFLICTS: ClipboardImportPlan = {
  collections: [
    {
      id: 'source:spacing',
      name: 'Spacing',
      variableCount: 6,
      existing: { id: 'target:spacing', name: 'Spacing' }
    },
    { id: 'source:brand', name: 'Brand', variableCount: 1, existing: null },
    {
      id: 'source:theme',
      name: 'Theme colors for marketing and product surfaces',
      variableCount: 24,
      existing: { id: 'target:theme', name: 'Theme colors for marketing and product surfaces' }
    }
  ],
  styles: [
    {
      id: 'source:primary',
      name: 'Brand/Primary',
      type: 'FILL',
      existing: { id: 'target:primary', name: 'Brand/Primary' }
    },
    {
      id: 'source:shadow',
      name: 'Elevation/Card',
      type: 'EFFECT',
      existing: { id: 'target:shadow', name: 'Elevation/Card' }
    }
  ]
}

const meta = {
  title: 'App/Editor/Clipboard Import Dialog',
  tags: ['autodocs'],
  args: { plan: NOTHING_HERE, onAnswer: fn() },
  render: (args) => ({
    components: { ClipboardImportDialog },
    setup: () => ({ args }),
    template: `
      <div class="h-[520px]">
        <ClipboardImportDialog :open="true" :plan="args.plan" @answer="args.onAnswer" />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** Nothing clashes: the question is import or paste as is. Return imports. */
export const Default: Story = {
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole('dialog')
    const confirm = within(dialog).getByTestId('clipboard-import-confirm')
    await waitFor(() => expect(confirm).toHaveFocus())
    await userEvent.keyboard('{Enter}')
    await expect(args.onAnswer).toHaveBeenCalledWith({ mode: 'import', resolutions: {} })
  }
}

/** The document already has some of the copied collections and styles by name. */
export const Conflicts: Story = {
  args: { plan: CONFLICTS }
}

/** Add renamed on one row keeps the copy apart; the others use what the document has. */
export const AddRenamed: Story = {
  args: { plan: CONFLICTS },
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole('dialog')
    const rows = within(dialog).getAllByTestId('clipboard-import-conflict')
    await expect(rows).toHaveLength(4)
    const [spacing] = rows
    await userEvent.click(within(spacing).getByRole('button', { name: 'Add renamed' }))
    await userEvent.click(within(dialog).getByTestId('clipboard-import-confirm'))
    await expect(args.onAnswer).toHaveBeenCalledWith({
      mode: 'import',
      resolutions: { 'source:spacing': 'add-renamed' }
    })
  }
}

export const PasteAsIs: Story = {
  args: { plan: CONFLICTS },
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole('dialog')
    await userEvent.click(within(dialog).getByTestId('clipboard-import-as-is'))
    await expect(args.onAnswer).toHaveBeenCalledWith({ mode: 'as-is' })
  }
}

/** Escape cancels the paste. */
export const EscapeCancels: Story = {
  play: async ({ args }) => {
    await within(document.body).findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await expect(args.onAnswer).toHaveBeenCalledWith(null)
  }
}
