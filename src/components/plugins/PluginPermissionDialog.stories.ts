import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import { installPlugin } from '@/app/plugins/catalog'
import { answerPluginPermission, requestPluginPermission } from '@/app/plugins/permission'
import type { InstalledPlugin } from '@/app/plugins/schema'

import PluginPermissionDialog from './PluginPermissionDialog.vue'

function installed(capabilities: string[]): InstalledPlugin {
  const result = installPlugin(
    [],
    JSON.stringify({
      id: 'guide.marks',
      name: 'Marks',
      version: '1.0.0',
      source: '/* marks */',
      command: 'Mark',
      capabilities
    })
  )
  if (!result.ok) throw new Error(result.message)
  return result.plugins[0]
}

const meta = {
  title: 'App/Plugins/Permission',
  beforeEach: () => () => answerPluginPermission(null),
  render: () => ({
    components: { PluginPermissionDialog },
    template: '<PluginPermissionDialog />'
  })
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** The prompt names the plugin, offers only what this host can do, and refuses the run. */
export const Asks: Story = {
  play: async () => {
    const pending = requestPluginPermission(installed(['document:read', 'code:execute']))
    const root = await waitForDialog()
    await expect(within(root).getByText('Run Marks?')).toBeVisible()
    await expect(
      within(root).getByRole('switch', { name: 'Read the open document.' })
    ).toBeChecked()
    // Run code is asked for but this host cannot perform it, so it is listed, not offered.
    await expect(within(root).queryByRole('switch', { name: 'Run code.' })).toBeNull()
    await expect(within(root).getByText('Run code.')).toBeVisible()
    await userEvent.click(within(root).getByTestId('plugin-permission-refuse'))
    await expect(pending).resolves.toBeNull()
  }
}

/** Unchecking a capability and running reports it back as refused. */
export const RefusesOneCapability: Story = {
  play: async () => {
    const pending = requestPluginPermission(installed(['document:read', 'document:write']))
    const root = await waitForDialog()
    const write = within(root).getByRole('switch', { name: 'Change the open document.' })
    await expect(write).toBeChecked()
    await userEvent.click(write)
    await expect(write).not.toBeChecked()
    await userEvent.click(within(root).getByTestId('plugin-permission-allow'))
    await expect(pending).resolves.toEqual(['document:read'])
  }
}

async function waitForDialog(): Promise<HTMLElement> {
  return within(document.body).findByTestId('plugin-permission-dialog')
}
