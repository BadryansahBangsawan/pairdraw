/**
 * Closes the network for plugin code. Like the script worker, the worker's own globals are
 * replaced before the first run, so a plugin reaches no network even by name.
 */
export const PLUGIN_NETWORK_UNAVAILABLE_ERROR = 'Network access is unavailable in plugins.'

const blocked = () => {
  throw new Error(PLUGIN_NETWORK_UNAVAILABLE_ERROR)
}

/** Replace the network globals of one worker-like scope. */
export function blockPluginNetwork(scope: object): void {
  Object.defineProperties(scope, {
    fetch: { value: blocked, configurable: true },
    XMLHttpRequest: { value: undefined, configurable: true },
    WebSocket: { value: undefined, configurable: true },
    EventSource: { value: undefined, configurable: true },
    importScripts: { value: blocked, configurable: true }
  })
}