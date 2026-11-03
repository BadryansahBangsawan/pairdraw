import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, within } from 'storybook/test'
import { ref } from 'vue'

import type { DocumentWorkspaceSource } from '@open-pencil/vue/document/workspace'

import type { DraftMeta } from '@/app/document/drafts'
import { createDeferred } from '@/app/runtime/deferred'

import DraftsSection from './DraftsSection.vue'

type Listing = 'drafts' | 'empty' | 'loading' | 'error'

type Args = {
  listing: Listing
  available: boolean
  query: string
  view: 'grid' | 'list'
  onOpen: (draft: DraftMeta) => void
  onOpenMany: (drafts: DraftMeta[]) => void
  onSaveAs: (draft: DraftMeta) => void
}

const drafts: DraftMeta[] = [
  {
    id: 'pricing',
    name: 'Pricing page',
    updatedAt: '2026-11-03T09:41:00Z',
    hasThumb: false,
    byteLength: 48_000
  },
  {
    id: 'onboarding',
    name: 'Onboarding flow',
    updatedAt: '2026-11-02T16:05:00Z',
    hasThumb: false,
    byteLength: 112_000
  },
  {
    id: 'icons',
    name: 'Icon explorations',
    updatedAt: '2026-10-28T11:20:00Z',
    hasThumb: false,
    byteLength: 9_000
  }
]

/** Stands in for this device's drafts store, answering as each listing asks. */
function source(listing: Listing): DocumentWorkspaceSource<DraftMeta> {
  return {
    refresh: () => {
      // Never answers, so the list keeps loading.
      if (listing === 'loading') return createDeferred<DraftMeta[]>().promise
      if (listing === 'error') return Promise.reject(new Error('The drafts could not be read.'))
      return Promise.resolve(listing === 'empty' ? [] : drafts)
    },
    loadPreview: async () => null
  }
}

/** Home's Drafts: new designs this device keeps until they are saved somewhere. */
const meta = {
  title: 'App/Home/Drafts',
  tags: ['autodocs'],
  args: {
    listing: 'drafts',
    available: true,
    query: '',
    view: 'grid',
    onOpen: fn(),
    onOpenMany: fn(),
    onSaveAs: fn()
  },
  render: (args) => ({
    components: { DraftsSection },
    setup: () => ({ args, source: source(args.listing), view: ref(args.view) }),
    template: `
      <div class="@container/home w-[880px] max-w-full bg-panel p-4 text-surface">
        <DraftsSection
          v-model:view="view"
          :source="source"
          :available="args.available"
          :query="args.query"
          @open="args.onOpen"
          @open-many="args.onOpenMany"
          @save-as="args.onSaveAs"
        />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Grid: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Pricing page')).toBeVisible()
  }
}

export const List: Story = { args: { view: 'list' } }

/** No drafts yet: a new design is kept here while it is worked on. */
export const Empty: Story = {
  args: { listing: 'empty' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('No drafts yet')).toBeVisible()
  }
}

/** With drafts off, the empty list says why nothing will appear instead of promising drafts. */
export const DraftsOff: Story = {
  args: { listing: 'empty', available: false },
  play: async ({ canvasElement }) => {
    const section = within(canvasElement)
    await expect(await section.findByText('Drafts are off')).toBeVisible()
    await expect(section.queryByText('No drafts yet')).toBeNull()
  }
}

export const Loading: Story = {
  args: { listing: 'loading' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Loading drafts')).toBeVisible()
  }
}

export const ReadFailed: Story = {
  args: { listing: 'error' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent(
      'The drafts could not be read.'
    )
  }
}

export const NoSearchMatches: Story = { args: { query: 'brand' } }
