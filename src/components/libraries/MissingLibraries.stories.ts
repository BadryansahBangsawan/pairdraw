import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import type { LibrarySummary } from '@pairdraw/core/library'

import type { MissingLibrary } from '@/app/libraries/relink'

import MissingLibraries from './MissingLibraries.vue'

type Args = {
  missing: MissingLibrary[]
  libraries: LibrarySummary[]
  disabled: boolean
  onRelink: (fromLibraryId: string, toLibraryId: string) => void
}

const missing: MissingLibrary[] = [
  { libraryId: 'brand-system', assetCount: 12, instanceCount: 48 },
  { libraryId: 'marketing-icons', assetCount: 3, instanceCount: 7 }
]

const libraries: LibrarySummary[] = [
  {
    libraryId: 'design-system',
    name: 'Design system',
    latestRevisionId: 'r2',
    publishedAt: '2026-10-01T00:00:00.000Z',
    assetCount: 14
  },
  {
    libraryId: 'icons',
    name: 'Icons',
    latestRevisionId: 'r5',
    publishedAt: '2026-10-12T00:00:00.000Z',
    assetCount: 220
  }
]

const meta = {
  title: 'App/Libraries/Missing Libraries',
  tags: ['autodocs'],
  args: { missing, libraries, disabled: false, onRelink: fn() },
  render: (args) => ({
    components: { MissingLibraries },
    setup: () => ({ args }),
    template: `
      <div class="max-w-xl bg-panel p-4 text-surface">
        <MissingLibraries
          :missing="args.missing"
          :libraries="args.libraries"
          :disabled="args.disabled"
          @relink="args.onRelink"
        />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByRole('combobox')).toHaveLength(2)
    await expect(canvas.getByText('12 assets · 48 instances')).toBeVisible()
  }
}

/** Choosing a library for a row relinks that missing library to it. */
export const ChoosesALibrary: Story = {
  args: { onRelink: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole('combobox', { name: /marketing-icons/ }))
    await userEvent.click(await page.findByRole('option', { name: 'Icons' }))
    await waitFor(() => expect(args.onRelink).toHaveBeenCalledWith('marketing-icons', 'icons'))
    await expect(args.onRelink).toHaveBeenCalledOnce()
  }
}

/** Counts read naturally for one asset and one instance. */
export const SingleUse: Story = {
  args: { missing: [{ libraryId: 'brand-system', assetCount: 1, instanceCount: 1 }] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('1 asset · 1 instance')).toBeVisible()
  }
}

/** Nothing to relink to yet: the alert says how to get a library instead of offering a choice. */
export const NoLibrariesToRelinkTo: Story = {
  args: { libraries: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument()
  }
}

export const Relinking: Story = { args: { disabled: true } }
