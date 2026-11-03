import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import {
  closeImageAIPrompt,
  openImageAIPrompt,
  type ImageAIPromptMode
} from '@/app/editor/image-ai'
import { createEditorStore } from '@/app/editor/session/create'

import ImageAIPromptDialog from './ImageAIPromptDialog.vue'

type Args = { mode: ImageAIPromptMode }

/** Opens the dialog for a document with one selected layer, as the canvas menu does. */
function openFor(mode: ImageAIPromptMode) {
  closeImageAIPrompt()
  const store = createEditorStore()
  const layer = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
    name: 'Photo',
    width: 320,
    height: 180
  })
  store.select([layer.id])
  openImageAIPrompt(store, mode)
}

const meta = {
  title: 'App/Image AI/Prompt Dialog',
  tags: ['autodocs'],
  args: { mode: 'generate-image' },
  argTypes: {
    mode: {
      control: 'select',
      options: ['generate-image', 'generate-svg', 'generate-fill', 'replace-background']
    }
  },
  render: (args) => ({
    components: { ImageAIPromptDialog },
    setup() {
      openFor(args.mode)
      return {}
    },
    template: '<div class="h-[420px]"><ImageAIPromptDialog /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** A new image: its shape and whether its background is transparent. */
export const GenerateImage: Story = {}

export const GenerateSVG: Story = { args: { mode: 'generate-svg' } }

/** A fill takes the shape of its wide layer, so the dialog asks only for the prompt. */
export const GenerateImageFill: Story = { args: { mode: 'generate-fill' } }

/** The prompt has focus, and Replace waits for one. */
export const ReplaceBackground: Story = {
  args: { mode: 'replace-background' },
  play: async () => {
    const dialog = within(await within(document.body).findByRole('dialog'))
    const input = dialog.getByRole('textbox')
    const submit = dialog.getByRole('button', { name: 'Replace' })
    await waitFor(() => expect(input).toHaveFocus())
    await expect(submit).toBeDisabled()
    await userEvent.type(input, 'a sunny beach')
    await expect(submit).toBeEnabled()
  }
}
