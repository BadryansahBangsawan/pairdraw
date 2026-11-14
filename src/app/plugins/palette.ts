import { computed } from 'vue'

import { settingsMessages } from '@pairdraw/vue/i18n'
import type {
  CommandPaletteGroup,
  CommandPaletteItem
} from '@pairdraw/vue/primitives/CommandPalette'

import { toast } from '@/app/shell/ui'
import { activeTab } from '@/app/tabs'

import { ensurePluginsAnswered, requestPluginPermission } from './permission'
import { runInstalledPlugin, type PluginRunOutcome } from './sandbox/evaluate'
import type { InstalledPlugin, PluginCapability } from './schema'
import { installedPlugins, replaceInstalledPlugins } from './store'

/**
 * The palette entries one installed list offers: every enabled plugin, under the command its
 * manifest names. A disabled plugin has no entry, so disabling it takes its command away.
 */
export function pluginPaletteItems(
  plugins: readonly InstalledPlugin[],
  run: (id: string) => void = runPluginFromPalette
): CommandPaletteItem[] {
  return plugins
    .filter((plugin) => plugin.enabled)
    .map((plugin) => ({
      id: `plugin:${plugin.id}`,
      label: plugin.command,
      description: plugin.name,
      keywords: ['plugin', plugin.id],
      onSelect: () => run(plugin.id)
    }))
}

/**
 * One run started from the palette: asks for the capabilities the plugin needs before its first
 * run, runs it against the active document, and reports a failure without changing the document.
 * A cancelled prompt or a refusal to store the answer runs nothing.
 */
async function runPluginFromPalette(id: string): Promise<PluginRunOutcome | null> {
  const answered = await ensurePluginsAnswered(
    installedPlugins.value,
    id,
    (_plugin): Promise<PluginCapability[] | null> => requestPluginPermission(_plugin)
  )
  if (!answered) return null
  replaceInstalledPlugins(answered)
  const tab = activeTab.value
  const outcome = await runInstalledPlugin(answered, id, {
    store: tab?.kind === 'document' ? tab.store : undefined,
    // A grant taken away during the run applies to the next call, not the next run.
    readPlugins: () => installedPlugins.value
  })
  if (!outcome.ok) toast.error(outcome.error)
  return outcome
}

/** Palette group for the app's plugins, or `null` when none of them is enabled. */
export function usePluginPaletteGroup() {
  return computed<CommandPaletteGroup | null>(() => {
    // The entries follow installs, removals and the enable switch.
    const items = pluginPaletteItems(installedPlugins.value)
    if (items.length === 0) return null
    return { id: 'plugins', label: settingsMessages.get().plugins, items }
  })
}
