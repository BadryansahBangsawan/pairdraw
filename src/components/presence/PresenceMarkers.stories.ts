import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'

import type { PagePresenceEntry } from '@/app/presence/registry'

import { colors } from './examples/room'
import PresenceMarkers from './PresenceMarkers.vue'

const { ana, ben, agent } = colors

const anaWithAgent: PagePresenceEntry[] = [
  { id: 'person:ana', kind: 'person', name: 'Ana', color: ana },
  { id: 'agent:orbit', kind: 'agent', name: 'Orbit', color: agent }
]

type Args = { entries: PagePresenceEntry[] }

const meta = {
  title: 'App/Collaboration/Page Presence Markers',
  component: PresenceMarkers,
  tags: ['autodocs'],
  args: { entries: anaWithAgent },
  render: (args) => ({
    components: { PresenceMarkers },
    setup: () => ({ args }),
    template:
      '<div class="flex w-56 items-center gap-2 bg-panel p-3 text-xs text-surface"><span class="flex-1">Checkout</span><PresenceMarkers v-bind="args" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Person: Story = {
  args: { entries: [{ id: 'person:ben', kind: 'person', name: 'Ben', color: ben }] }
}

export const PersonAndTheirAgent: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img')).toHaveAccessibleName('Ana, Orbit')
  }
}

export const YourAgent: Story = {
  args: { entries: [{ id: 'agent:fern', kind: 'agent', name: 'Fern', color: agent }] }
}

export const MoreThanFit: Story = {
  args: {
    entries: [
      ...anaWithAgent,
      { id: 'person:ben', kind: 'person', name: 'Ben', color: ben },
      { id: 'agent:pixel', kind: 'agent', name: 'Pixel', color: agent },
      { id: 'agent:fern', kind: 'agent', name: 'Fern', color: agent }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('+2')).toBeVisible()
    await expect(canvas.getByRole('img')).toHaveAccessibleName('Ana, Orbit, Ben, Pixel, Fern')
  }
}

export const Nobody: Story = {
  args: { entries: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('img')).toBeNull()
  }
}
