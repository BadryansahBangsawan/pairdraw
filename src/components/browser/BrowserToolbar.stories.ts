import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import {
  browserState,
  markClosed,
  markLoadFailed,
  markNavigating,
  markPageLoaded
} from '@/app/browser/state'

import BrowserToolbar from './BrowserToolbar.vue'

/** The controls that only a browser window can answer are all here, so they are all disabled outside it. */
const WINDOW_CONTROLS = [
  'browser-address',
  'browser-open',
  'browser-back',
  'browser-forward',
  'browser-reload',
  'browser-close',
  'browser-zoom-out',
  'browser-zoom-in',
  'browser-import-page',
  'browser-import-element',
  'browser-shot-visible',
  'browser-shot-full',
  'browser-shot-element'
]

const meta = {
  title: 'App/Browser/Toolbar',
  beforeEach: () => {
    const previous = { ...browserState }
    markClosed()
    return () => Object.assign(browserState, previous)
  },
  render: () => ({
    components: { BrowserToolbar },
    template: '<div class="flex justify-end"><BrowserToolbar /></div>'
  })
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** The panel teleports to the body once the trigger opens it. */
async function openToolbar(): Promise<HTMLElement> {
  await userEvent.click(within(document.body).getByTestId('editor-browser'))
  return within(document.body).findByTestId('browser-toolbar')
}

/** Storybook is not the desktop app, so the panel says so and disables everything that needs the window. */
export const OutsideTheDesktopApp: Story = {
  play: async () => {
    const toolbar = within(await openToolbar())
    await expect(toolbar.getByRole('status')).toHaveTextContent(
      'The built-in browser is part of the desktop app.'
    )
    for (const id of WINDOW_CONTROLS) await expect(toolbar.getByTestId(id)).toBeDisabled()
    await expect(toolbar.getByRole('combobox', { name: 'Device' })).toBeDisabled()
  }
}

/** No page is open: the address is empty and no title is shown beside the heading. */
export const ClosedWindow: Story = {
  play: async () => {
    const toolbar = within(await openToolbar())
    await expect(toolbar.getByTestId('browser-address')).toHaveValue('')
    await expect(toolbar.queryByText('Example Domain')).toBeNull()
  }
}

/** A page asked for but not reported yet: only the address shows, since the panel has no progress. */
export const LoadingAPage: Story = {
  play: async () => {
    markNavigating('https://example.com')
    const toolbar = within(await openToolbar())
    await expect(toolbar.getByTestId('browser-address')).toHaveValue('https://example.com')
    await expect(toolbar.queryByText('Example Domain')).toBeNull()
  }
}

/** The window reported a page: the address and its title are the panel's only account of it. */
export const LoadedPage: Story = {
  play: async () => {
    markPageLoaded({ url: 'https://example.com', title: 'Example Domain' })
    const toolbar = within(await openToolbar())
    await expect(toolbar.getByTestId('browser-address')).toHaveValue('https://example.com')
    await expect(toolbar.getByText('Example Domain')).toBeVisible()
  }
}

/** The load failed: the address stays so it can be retried, and nothing announces the failure. */
export const LoadFailure: Story = {
  play: async () => {
    markNavigating('https://example.invalid')
    markLoadFailed()
    const toolbar = within(await openToolbar())
    await expect(toolbar.getByTestId('browser-address')).toHaveValue('https://example.invalid')
    await expect(toolbar.queryByRole('alert')).toBeNull()
  }
}
