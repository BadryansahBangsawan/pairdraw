import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { TooltipProvider } from 'reka-ui'
import { expect, fn, userEvent, within } from 'storybook/test'

import TextLinkForm from './TextLinkForm.vue'

/** A script address, which the form must refuse; the story never runs it. */
// eslint-disable-next-line no-script-url -- Rejection fixture; this URL is never executed.
const SCRIPT_URL = 'javascript:alert(1)'

type TextLinkStoryArgs = {
  url?: string
  link?: 'none' | 'url' | 'layer' | 'mixed'
  layerName?: string
  onApply: (url: string) => void
  onRemove: () => void
  onOpen: () => void
  onCancel: () => void
}

const meta = {
  title: 'App/Editor/Text Link',
  component: TextLinkForm,
  args: {
    onApply: fn(),
    onRemove: fn(),
    onOpen: fn(),
    onCancel: fn()
  },
  render: (args) => ({
    components: { TextLinkForm, TooltipProvider },
    setup: () => ({ args }),
    template: `<TooltipProvider>
      <div class="w-fit rounded-xl border border-border bg-panel elevation-floating">
        <TextLinkForm v-bind="args" />
      </div>
    </TooltipProvider>`
  })
} satisfies Meta<TextLinkStoryArgs>

export default meta
type Story = StoryObj<typeof meta>

/** Text that links nowhere yet: only Apply does anything. */
export const NoLink: Story = {
  args: { link: 'none' }
}

export const WebLink: Story = {
  args: { link: 'url', url: 'https://example.com/docs' }
}

/** Characters that link to different places; Open has no single place to go. */
export const SeveralLinks: Story = {
  args: { link: 'mixed' }
}

/** A link from a `.fig` file to a frame of the document. */
export const LinkToLayer: Story = {
  args: { link: 'layer', layerName: 'Pricing' }
}

export const AppliesTypedAddress: Story = {
  args: { link: 'none' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole('textbox', { name: 'Link address' }), 'example.com')
    await userEvent.click(canvas.getByRole('button', { name: 'Apply' }))
    await expect(args.onApply).toHaveBeenCalledWith('example.com')
  }
}

export const RefusesScriptAddress: Story = {
  args: { link: 'none' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole('textbox', { name: 'Link address' })
    await userEvent.type(field, `${SCRIPT_URL}{Enter}`)
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(field).toHaveAccessibleDescription()
    await expect(args.onApply).not.toHaveBeenCalled()
  }
}
