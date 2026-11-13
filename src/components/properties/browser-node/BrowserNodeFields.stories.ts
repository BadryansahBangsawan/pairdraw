import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import BrowserNodeFields from './BrowserNodeFields.vue'

interface Args {
  url: string
  preset: string
  refreshedAt: string
  canRefresh: boolean
  refreshing: boolean
  error: string
  onCommitAddress: (url: string) => void
  onCommitPreset: (preset: string) => void
  onRefresh: () => void
  onOpen: () => void
}

const meta = {
  title: 'App/Editor/Properties/Browser snapshot',
  component: BrowserNodeFields,
  args: {
    url: 'https://example.com/docs',
    preset: 'desktop',
    refreshedAt: '2026-11-13T00:00:00.000Z',
    canRefresh: true,
    refreshing: false,
    error: '',
    onCommitAddress: fn(),
    onCommitPreset: fn(),
    onRefresh: fn(),
    onOpen: fn()
  },
  parameters: {
    docs: {
      description: {
        component:
          'A page snapshot as the Design panel shows it: the stored address, the device preset, when the picture was taken, and the desktop actions that refresh it or open that page.'
      }
    }
  },
  render: (args) => ({
    components: { BrowserNodeFields },
    setup: () => ({ args }),
    template: `
      <div class="w-[240px] bg-panel p-4">
        <BrowserNodeFields v-bind="args" />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** A bare host commits as the address the window would open. A file address does not commit. */
export const Address: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const address = canvas.getByRole('textbox', { name: 'Address' })
    await userEvent.clear(address)
    await userEvent.type(address, 'example.com')
    await userEvent.tab()
    await waitFor(() => expect(args.onCommitAddress).toHaveBeenCalledWith('https://example.com/'))
    await userEvent.clear(address)
    await userEvent.type(address, 'file:///etc/passwd')
    await userEvent.tab()
    await expect(args.onCommitAddress).toHaveBeenCalledOnce()
    await expect(await canvas.findByRole('alert')).toBeVisible()
  }
}

/** Choosing a device the toolbar already lists stores that preset. */
export const Device: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole('combobox', { name: 'Device' }))
    await userEvent.click(await page.findByRole('option', { name: 'Phone, 390 by 844' }))
    await waitFor(() => expect(args.onCommitPreset).toHaveBeenCalledWith('iphone-14'))
  }
}

/** Refresh and Open report the click. They do not load a page from the story. */
export const Actions: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Refresh' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Open in browser' }))
    await expect(args.onRefresh).toHaveBeenCalledOnce()
    await expect(args.onOpen).toHaveBeenCalledOnce()
  }
}

/** Outside the desktop app the picture stays, and the address can still be corrected. */
export const BrowserTab: Story = {
  args: { canRefresh: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Refresh' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Open in browser' })).toBeDisabled()
    await expect(canvas.getByRole('textbox', { name: 'Address' })).toBeEnabled()
    await expect(canvas.getByRole('combobox', { name: 'Device' })).toBeEnabled()
    await expect(canvas.getByRole('status')).toBeVisible()
  }
}

/** The machine-readable instant is the stored one. */
export const Refreshed: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('browser-node-refreshed')).toHaveAttribute(
      'datetime',
      '2026-11-13T00:00:00.000Z'
    )
  }
}
