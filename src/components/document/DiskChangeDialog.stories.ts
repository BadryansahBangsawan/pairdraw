import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  answerDiskChangePrompt,
  diskChangePrompt,
  requestDiskChangeChoice,
  type DiskChangeChoice
} from '@/app/document/io/watch/prompt'

import DiskChangeDialog from './DiskChangeDialog.vue'
import DiskChangeDialogHost from './DiskChangeDialogHost.vue'

type Args = { documentName: string; onReload: () => void; onIgnore: () => void }

const meta = {
  title: 'App/Document/Disk Change Dialog',
  tags: ['autodocs'],
  args: { documentName: 'Pricing page', onReload: fn(), onIgnore: fn() },
  render: (args) => ({
    components: { DiskChangeDialog },
    setup: () => ({ args }),
    template: `
      <div class="h-[400px]">
        <DiskChangeDialog
          :open="true"
          :document-name="args.documentName"
          @reload="args.onReload"
          @ignore="args.onIgnore"
        />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Return keeps the edits: Ignore is focused, and Reload is a deliberate choice. */
export const KeepsEditsByDefault: Story = {
  play: async ({ args }) => {
    const body = within(document.body)
    const dialog = await body.findByRole('alertdialog')
    const buttons = within(dialog).getAllByRole('button')
    const [reload, ignore] = buttons
    await waitFor(() => expect(ignore).toHaveFocus())
    await userEvent.click(reload)
    await expect(args.onReload).toHaveBeenCalledOnce()
    await expect(args.onIgnore).not.toHaveBeenCalled()
  }
}

export const LongDocumentName: Story = {
  args: { documentName: 'Quarterly marketing site redesign — homepage, pricing and onboarding' }
}

const answers: Record<string, DiskChangeChoice> = {}

/**
 * Two tabs changed on disk with unsaved edits. The dialog stays open from the first question to
 * the second: answering Reload by keyboard still leaves Ignore focused for the second, and Escape
 * answers it without stranding a question behind it.
 */
export const QueuedQuestions: Story = {
  render: () => ({
    components: { DiskChangeDialogHost },
    setup() {
      while (diskChangePrompt.value) answerDiskChangePrompt('ignore')
      for (const name of ['Pricing page', 'Checkout flow', 'Onboarding']) {
        void requestDiskChangeChoice(name).choice.then((choice) => {
          answers[name] = choice
          return undefined
        })
      }
      return {}
    },
    template: '<div class="h-[400px]"><DiskChangeDialogHost /></div>'
  }),
  play: async () => {
    const body = within(document.body)
    const ignoreFocused = async (name: string) => {
      const dialog = await body.findByRole('alertdialog', { name: new RegExp(name) })
      const [, ignore] = within(dialog).getAllByRole('button')
      await waitFor(() => expect(ignore).toHaveFocus())
      return dialog
    }

    const first = await ignoreFocused('Pricing page')
    const [reload] = within(first).getAllByRole('button')
    reload.focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(answers['Pricing page']).toBe('reload'))

    await ignoreFocused('Checkout flow')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(answers['Checkout flow']).toBe('ignore'))

    await ignoreFocused('Onboarding')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(answers.Onboarding).toBe('ignore'))
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument())
  }
}
