import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import type { RecentFilesSort } from '@/app/recent-files/sort'

import RecentFilesSortMenu from './RecentFilesSortMenu.vue'

type Args = { modelValue: RecentFilesSort; size?: 'sm' | 'lg' }

/** The order picker in Recent's header: the current order on the button, the orders in a menu. */
const meta = {
  title: 'App/Home/Recent Files Sort',
  component: RecentFilesSortMenu,
  args: { modelValue: 'last-used' },
  render: (args: Args) => ({
    components: { RecentFilesSortMenu },
    setup: () => ({ args, sort: ref(args.modelValue) }),
    template: `
      <div class="flex justify-end rounded-card border border-border bg-panel p-4 text-surface">
        <RecentFilesSortMenu v-model="sort" :size="args.size" />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const LastUsed: Story = {}
export const ByName: Story = { args: { modelValue: 'name' } }
export const ByCreated: Story = { args: { modelValue: 'created' } }

/** The larger button touch screens get. */
export const Touch: Story = { args: { size: 'lg' } }

/** Picking an order from the menu puts it on the button. */
export const PickOrder: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /Last used/ }))
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('menuitemradio', { name: 'Name' }))
    await expect(canvas.getByRole('button', { name: /Name/ })).toBeVisible()
  }
}
