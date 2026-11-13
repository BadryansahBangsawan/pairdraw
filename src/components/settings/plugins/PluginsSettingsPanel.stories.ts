import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import { installedPluginsSnapshot, replaceInstalledPlugins } from '@/app/plugins/store'

import PluginsSettingsPanel from './PluginsSettingsPanel.vue'

const MARKS = JSON.stringify({
  id: 'guide.marks',
  name: 'Marks',
  version: '1.0.0',
  source: '/* marks */',
  command: 'Mark',
  capabilities: ['document:read']
})

const NETWORK = JSON.stringify({
  id: 'guide.net',
  name: 'Net',
  version: '1.0.0',
  source: '/* net */',
  command: 'Net',
  capabilities: ['network:access']
})

const meta = {
  title: 'App/Settings/Plugins',
  beforeEach: () => {
    const previous = installedPluginsSnapshot()
    replaceInstalledPlugins([])
    return () => replaceInstalledPlugins(previous)
  },
  render: () => ({
    components: { PluginsSettingsPanel },
    template: '<PluginsSettingsPanel />'
  })
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function panel(): HTMLElement {
  return within(document.body).getByTestId('settings-plugins-panel')
}

function named(name: string): RegExp {
  return new RegExp(`^${name}$`)
}

async function pasteManifest(root: HTMLElement, text: string): Promise<void> {
  const box = within(root).getByRole('textbox', { name: named('Plugin manifest') })
  await userEvent.click(box)
  await userEvent.clear(box)
  await userEvent.paste(text)
}

/** The page says plugins do not run, and an empty list says so. */
export const Empty: Story = {
  play: async () => {
    const root = panel()
    await expect(within(root).getByRole('status')).toHaveTextContent(
      'Plugins run from the command palette'
    )
    await expect(within(root).getByText('No plugins installed')).toBeVisible()
    await expect(within(root).getByRole('button', { name: named('Choose file') })).toBeVisible()
  }
}

/** Paste installs the plugin, the switch disables it, and remove clears the list. */
export const InstallsEnablesAndRemoves: Story = {
  play: async () => {
    const root = panel()
    await pasteManifest(root, MARKS)
    await userEvent.click(within(root).getByRole('button', { name: named('Install') }))
    await expect(within(root).getByText('Marks')).toBeVisible()
    await expect(within(root).getByText(/Read the open document/)).toBeVisible()
    await expect(within(root).getByRole('status')).toHaveTextContent(
      'Plugins run from the command palette'
    )
    const toggle = within(root).getByRole('switch', { name: named('Enable Marks') })
    await expect(toggle).toBeChecked()
    await userEvent.click(toggle)
    await expect(toggle).not.toBeChecked()
    await userEvent.click(within(root).getByRole('button', { name: named('Remove Marks') }))
    await userEvent.click(within(document.body).getByRole('button', { name: named('Remove') }))
    await expect(within(root).getByText('No plugins installed')).toBeVisible()
  }
}

/** A manifest that asks for network access is refused and adds no row. */
export const RefusesNetworkAccess: Story = {
  play: async () => {
    const root = panel()
    await pasteManifest(root, NETWORK)
    await userEvent.click(within(root).getByRole('button', { name: named('Install') }))
    await expect(within(root).getByRole('alert')).toHaveTextContent(
      'Plugins cannot ask for network access.'
    )
    await expect(within(root).queryByText('Net')).toBeNull()
  }
}

/** Installing the same id twice keeps one row and says it is already installed. */
export const RefusesADuplicate: Story = {
  play: async () => {
    const root = panel()
    await pasteManifest(root, MARKS)
    await userEvent.click(within(root).getByRole('button', { name: named('Install') }))
    await pasteManifest(root, MARKS)
    await userEvent.click(within(root).getByRole('button', { name: named('Install') }))
    await expect(within(root).getByRole('alert')).toHaveTextContent('guide.marks')
    await expect(within(root).getAllByText('Marks')).toHaveLength(1)
  }
}
