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

export const PLUGIN_GRANT_DISABLED_MESSAGE = 'Enable the plugin before granting a capability.'

export function pluginGrantUnavailableMessage(capability: string): string {
  return `This version cannot perform "${capability}".`
}

export function pluginGrantMissingMessage(id: string): string {
  return `No plugin with the id "${id}" is installed.`
}

export function pluginGrantNotRequestedMessage(capability: string): string {
  return `This plugin did not ask for "${capability}".`
}

export const PLUGIN_DISABLED_MESSAGE = 'Enable this plugin before running it.'

export const PLUGIN_RUN_ENDED_MESSAGE = 'The plugin run has ended.'

export function pluginRunMissingMessage(id: string): string {
  return `No plugin with the id "${id}" is installed.`
}

export function pluginCallDeniedMessage(capability: string): string {
  return `This plugin was not granted "${capability}".`
}

export function pluginCallUnknownMessage(name: string): string {
  return `No tool named "${name}".`
}

export const PLUGIN_CALL_INVALID_ARGS_MESSAGE = 'This call has arguments the tool does not accept.'

export const PLUGIN_CALL_UNAVAILABLE_MESSAGE =
  'This run has no document to call; a plugin can only reach tools in the app.'

export const PLUGIN_POINTER_BUSY_MESSAGE = 'Another plugin is using the canvas pointer.'

export const PLUGIN_POINTER_CANCELLED_MESSAGE =
  'The canvas pointer was cancelled; this run cannot ask for it again.'
