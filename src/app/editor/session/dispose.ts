/** Callbacks a document runs once as it closes, so work queued for it can be dropped. */
export function createDisposeListeners() {
  const listeners = new Set<() => void>()
  return {
    /** Calls back once as the document closes; returns a function that stops listening. */
    onDispose: (listener: () => void): (() => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    notifyDispose: (): void => {
      for (const listener of listeners) listener()
      listeners.clear()
    }
  }
}
