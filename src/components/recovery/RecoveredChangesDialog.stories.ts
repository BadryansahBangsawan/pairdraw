import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { ref } from 'vue'

import RecoveredChangesDialog from './RecoveredChangesDialog.vue'

type Args = {
  documentName: string
  backedUpAt: string
  busy: boolean
  onSave: () => void
  onSaveAs: () => void
  onDiscard: () => void
  onLater: () => void
}

const meta = {
  title: 'App/Recovery/Recovered Changes Dialog',
  tags: ['autodocs'],
  args: {
    documentName: 'Pricing page',
    backedUpAt: 'Nov 3, 2026, 9:41 AM',
    busy: false,
    onSave: fn(),
    onSaveAs: fn(),
    onDiscard: fn(),
    onLater: fn()
  },
  render: (args) => ({
    components: { RecoveredChangesDialog },
    setup: () => ({ args }),
    template: `
      <div class="h-[400px]">
        <RecoveredChangesDialog
          :open="true"
          :document-name="args.documentName"
          :backed-up-at="args.backedUpAt"
          :busy="args.busy"
          @save="args.onSave"
          @save-as="args.onSaveAs"
          @discard="args.onDiscard"
          @later="args.onLater"
        />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Return saves the recovered changes into the file; the other answers are deliberate. */
export const SavesByDefault: Story = {
  play: async ({ args }) => {
    const body = within(document.body)
    const dialog = await body.findByRole('alertdialog')
    const [, , save] = within(dialog).getAllByRole('button')
    await waitFor(() => expect(save).toHaveFocus())
    await userEvent.keyboard('{Enter}')
    await expect(args.onSave).toHaveBeenCalledOnce()
    await expect(args.onDiscard).not.toHaveBeenCalled()
  }
}

/** Escape answers later: the backup stays for the next time the file opens. */
export const EscapeAnswersLater: Story = {
  play: async ({ args }) => {
    const body = within(document.body)
    await body.findByRole('alertdialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(args.onLater).toHaveBeenCalledOnce())
    await expect(args.onDiscard).not.toHaveBeenCalled()
  }
}

/** While an answer is carried out, no other can start. */
export const Busy: Story = {
  args: { busy: true },
  play: async () => {
    const dialog = await within(document.body).findByRole('alertdialog')
    for (const button of within(dialog).getAllByRole('button')) await expect(button).toBeDisabled()
  }
}

export const LongDocumentName: Story = {
  args: { documentName: 'Quarterly marketing site redesign — homepage, pricing and onboarding' }
}

/**
 * The dialog stays open from one queued file to the next; each new file moves focus back to
 * Save, so a Return meant for the next file never discards its backup.
 */
export const NextFileRefocusesSave: Story = {
  render: (args) => ({
    components: { RecoveredChangesDialog },
    setup: () => {
      const questionId = ref('backup-1')
      function discard() {
        args.onDiscard()
        questionId.value = 'backup-2'
      }
      return { args, questionId, discard }
    },
    template: `
      <div class="h-[400px]">
        <RecoveredChangesDialog
          :open="true"
          :document-name="args.documentName"
          :backed-up-at="args.backedUpAt"
          :busy="args.busy"
          :question-id="questionId"
          @save="args.onSave"
          @save-as="args.onSaveAs"
          @discard="discard"
          @later="args.onLater"
        />
      </div>`
  }),
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole('alertdialog')
    const [discard, , save] = within(dialog).getAllByRole('button')
    await userEvent.click(discard)
    await expect(args.onDiscard).toHaveBeenCalledOnce()
    await waitFor(() => expect(save).toHaveFocus())
  }
}
