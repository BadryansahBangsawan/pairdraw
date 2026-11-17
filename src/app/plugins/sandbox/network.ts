/**
 * Closes the network for plugin code. Like the script worker, the worker's own globals are
 * replaced before the first run, so a plugin reaches no network even by name.
 *
 * Each replacement is an own non-configurable property, and the same names are replaced on every
 * prototype up to `Object.prototype`. A configurable own property can be deleted, which exposes
 * the host function on the prototype again. `Worker` and `SharedWorker` are included. A callable
 * global that cannot be replaced refuses the sandbox, and the worker stops before the program runs.
 */
export const PLUGIN_NETWORK_UNAVAILABLE_ERROR = 'Network access is unavailable in plugins.'

/** The worker throws this instead of running a program that can still reach the network. */
export class PluginNetworkUnblockedError extends Error {
  readonly reason = 'network-global'
  constructor() {
    super(PLUGIN_NETWORK_UNAVAILABLE_ERROR)
    this.name = 'PluginNetworkUnblockedError'
  }
}

const blocked = () => {
  throw new Error(PLUGIN_NETWORK_UNAVAILABLE_ERROR)
}

const NETWORK_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'Worker',
  'SharedWorker',
  'WebTransport'
] as const

/** Whether `key` is still a callable host global after a replacement was refused. */
function callableNetworkGlobal(scope: object, key: string, replacement: unknown): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(scope, key)
  if (!descriptor) return false
  if (descriptor.get !== undefined || descriptor.set !== undefined) return true
  const current: unknown = descriptor.value
  if (replacement === undefined) return typeof current === 'function'
  return current !== replacement
}

function shadow(scope: object, key: string, value: unknown): void {
  try {
    Object.defineProperty(scope, key, {
      value,
      writable: false,
      enumerable: false,
      configurable: false
    })
  } catch (error) {
    if (!(error instanceof TypeError)) throw error
    if (callableNetworkGlobal(scope, key, value)) throw new PluginNetworkUnblockedError()
  }
}

function shadowNetwork(scope: object): void {
  for (const key of NETWORK_GLOBALS) {
    shadow(scope, key, key === 'fetch' || key === 'importScripts' ? blocked : undefined)
  }
}

/** Replace the network globals of one worker-like scope and of its prototypes. */
export function blockPluginNetwork(scope: object): void {
  const seen = new Set<object>()
  let current: object | null = scope
  while (current && current !== Object.prototype && !seen.has(current)) {
    seen.add(current)
    shadowNetwork(current)
    const next: unknown = Object.getPrototypeOf(current)
    current = typeof next === 'object' && next !== null ? next : null
  }
}
