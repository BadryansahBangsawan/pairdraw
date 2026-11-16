/**
 * Closes the network for code a sandbox worker runs. The worker's own globals are replaced before
 * the first run, so the code reaches no network even by name; a blocked call throws `message`.
 */
export function blockSandboxNetwork(scope: object, message: string): void {
  const blocked = () => {
    throw new Error(message)
  }
  Object.defineProperties(scope, {
    fetch: { value: blocked },
    XMLHttpRequest: { value: undefined },
    WebSocket: { value: undefined },
    EventSource: { value: undefined },
    importScripts: { value: blocked }
  })
}
