import { MAX_PLUGINS } from './limits'

export const PLUGIN_MANIFEST_INVALID_MESSAGE = 'This plugin manifest is not valid.'
export const PLUGIN_NETWORK_MESSAGE = 'Plugins cannot ask for network access.'
export const PLUGIN_TOO_LARGE_MESSAGE = 'This plugin manifest is larger than 64 KB.'
export const PLUGIN_TOO_MANY_MESSAGE = `This app already has ${MAX_PLUGINS} plugins, which is the limit.`

export function duplicatePluginMessage(id: string): string {
  return `A plugin with the id "${id}" is already installed.`
}

export function unknownCapabilityMessage(capability: string): string {
  return `Unknown capability "${capability}".`
}
