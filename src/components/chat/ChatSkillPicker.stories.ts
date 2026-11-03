import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { TooltipProvider } from 'reka-ui'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { readBuiltinSkills } from '@/app/ai/skills/sources/builtin'
import type { Skill } from '@/app/ai/skills/types'

import ChatSkillPicker from './ChatSkillPicker.vue'

interface Args {
  skills: readonly Skill[]
  disabled: boolean
  onOpen: () => void
  onPick: (name: string) => void
  onManage: () => void
}

const builtin = readBuiltinSkills().skills

const brandReview: Skill = {
  name: 'brand-review',
  description: 'Check a design against the Acme brand book: logo space, colors, and tone.',
  instructions: 'Compare every screen with the brand book.',
  modelInvocable: true,
  userInvocable: true,
  source: 'openpencil',
  location: 'brand-review',
  files: [],
  readFile: () => Promise.reject(new Error('No files')),
  warnings: []
}

const meta = {
  title: 'App/Chat/Skill Picker',
  component: ChatSkillPicker,
  args: { skills: builtin, disabled: false, onOpen: fn(), onPick: fn(), onManage: fn() },
  parameters: { layout: 'centered' },
  render: (args) => ({
    components: { ChatSkillPicker, TooltipProvider },
    setup: () => ({ args }),
    template: `
      <TooltipProvider>
        <div class="flex h-[30rem] w-80 items-end bg-panel p-3">
          <ChatSkillPicker v-bind="args" />
        </div>
      </TooltipProvider>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** The skills that ship with the app; picking one hands its name to the composer. */
export const BuiltIn: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Pick a skill' }))
    await expect(args.onOpen).toHaveBeenCalledOnce()
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(await page.findByRole('menuitem', { name: /^dark-mode/ }))
    await waitFor(() => expect(args.onPick).toHaveBeenCalledWith('dark-mode'))
  }
}

/** The user's own skills come first, above the built-in ones. */
export const WithOwnSkills: Story = {
  args: { skills: [brandReview, ...builtin] },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Pick a skill' }))
    const page = within(canvasElement.ownerDocument.body)
    const items = await page.findAllByRole('menuitem')
    await expect(items[0]).toHaveAccessibleName(/^brand-review/)
  }
}

/** Every source turned off: the menu says so and still leads to Settings. */
export const NoneTurnedOn: Story = {
  args: { skills: [] },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Pick a skill' }))
    const page = within(canvasElement.ownerDocument.body)
    await expect(await page.findByText('No skills are turned on.')).toBeVisible()
    // The menu itself carries why it is empty, for a screen reader that moves only by item.
    await expect(page.getByRole('menu', { name: 'Pick a skill' })).toHaveAccessibleDescription(
      'No skills are turned on.'
    )
    await userEvent.click(page.getByRole('menuitem', { name: 'Manage skills…' }))
    await waitFor(() => expect(args.onManage).toHaveBeenCalledOnce())
  }
}

export const Disabled: Story = { args: { disabled: true } }
