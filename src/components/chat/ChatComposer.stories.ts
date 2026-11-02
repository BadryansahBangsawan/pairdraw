import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { TooltipProvider } from 'reka-ui'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { ref } from 'vue'

import ChatDraftFile from './attachment/ChatDraftFile.vue'
import ChatComposer from './ChatComposer.vue'
import { chatInputTheme } from './ui'

interface Args {
  /** Prompts sent earlier in the conversation, oldest first. */
  prompts: string[]
  /** Names of text files attached to the message being written. */
  files: string[]
}

const meta = {
  title: 'App/Chat/Composer',
  args: { prompts: [], files: [] },
  parameters: { layout: 'centered' },
  render: (args) => ({
    components: { ChatComposer, ChatDraftFile, TooltipProvider },
    setup() {
      const files = ref([...args.files])
      const ui = chatInputTheme()
      return { args, files, ui, prompts: () => args.prompts }
    },
    template: `
      <TooltipProvider>
        <div class="w-[330px] bg-panel p-3">
          <ChatComposer status="ready" :prompts="prompts">
            <template v-if="files.length" #attachment>
              <div :class="ui.attachments()">
                <ChatDraftFile
                  v-for="(name, index) in files"
                  :key="name"
                  :name="name"
                  @remove="files.splice(index, 1)"
                />
              </div>
            </template>
          </ChatComposer>
        </div>
      </TooltipProvider>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

/** Up and Down step through what was sent in the conversation, as a shell's history does. */
export const PromptRecall: Story = {
  args: { prompts: ['Draw a pricing card', 'Make it blue'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole('textbox', { name: /^Describe a change/ })
    await userEvent.click(field)
    await userEvent.keyboard('{ArrowUp}')
    await waitFor(() => expect(field).toHaveTextContent('Make it blue'))
    await userEvent.keyboard('{ArrowUp}')
    await waitFor(() => expect(field).toHaveTextContent('Draw a pricing card'))
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(field).toHaveTextContent('Make it blue'))
  }
}

/** Text files, such as notes, a stylesheet, or code, wait above the field until sent. */
export const AttachedFiles: Story = {
  args: { files: ['tokens.css', 'brief.md', 'PricingCard.tsx'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Remove file brief.md' }))
    await expect(canvas.queryByText('brief.md')).toBeNull()
    await expect(canvas.getByText('tokens.css')).toBeVisible()
  }
}

/** A long file name shortens instead of widening the composer. */
export const LongFileName: Story = {
  args: { files: ['design-tokens-for-the-marketing-site-dark-theme-final-v2.css'] }
}
