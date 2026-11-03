import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { TooltipProvider } from 'reka-ui'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { ref } from 'vue'

import { DEFAULT_EXPLORE_SETTING, type ExploreSetting } from '@/app/ai/explore/request'

import ChatExplorePicker from './ChatExplorePicker.vue'

interface Args {
  setting: ExploreSetting
  disabled: boolean
}

const meta = {
  title: 'App/Chat/Explore Picker',
  args: { setting: DEFAULT_EXPLORE_SETTING, disabled: false },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '"Let it cook" in the composer: several variants side by side, exploring layout or style, or one design in a single pass. The trigger names the choice while it is on.'
      }
    }
  },
  render: (args) => ({
    components: { ChatExplorePicker, TooltipProvider },
    setup() {
      const setting = ref<ExploreSetting>({ ...args.setting })
      return { args, setting }
    },
    template: `
      <TooltipProvider>
        <div class="flex h-[22rem] w-80 items-end bg-panel p-3">
          <ChatExplorePicker v-model="setting" :disabled="args.disabled" />
        </div>
      </TooltipProvider>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** Off: an icon; choosing variants, a count, and an axis names them on the trigger. */
export const ChooseVariants: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Let it cook' }))
    const page = within(canvasElement.ownerDocument.body)
    const dialog = await page.findByRole('dialog', { name: 'Let it cook' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Variants' }))
    await userEvent.click(await within(dialog).findByRole('button', { name: '5' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Style' }))
    await expect(within(dialog).getByRole('button', { name: 'Style' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: /^Let it cook: / })).toHaveAttribute(
        'data-state',
        'on'
      )
    )
  }
}

/** Three layout variants are on, so every message asks for them until it is turned off. */
export const VariantsOn: Story = {
  args: { setting: { mode: 'variants', count: 3, axis: 'layout' } }
}

/** "Don't iterate": one design in a single pass. */
export const DontIterate: Story = {
  args: { setting: { ...DEFAULT_EXPLORE_SETTING, mode: 'single' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /^Let it cook: / }))
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Off' }))
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Let it cook' })).toHaveAttribute(
        'data-state',
        'off'
      )
    )
  }
}

export const Disabled: Story = { args: { disabled: true } }
