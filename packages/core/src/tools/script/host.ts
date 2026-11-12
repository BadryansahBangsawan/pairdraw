/**
 * What the `script` tool needs from the host: the sandbox and the node that carries its program
 * live in the app, so the app registers the runner for the documents it shows. A headless host
 * without a sandbox registers nothing, and the tool reports that it is unavailable.
 */
export interface ScriptToolHost {
  /** Places a code layer, writes its program, and runs it once there. */
  create(placement: {
    source: string
    x?: number
    y?: number
    parentId?: string
  }): Promise<{ id: string; ok: boolean; error?: string }>
  /** Replaces the program of an existing code layer, as an undo step. */
  setSource(id: string, source: string): void
  /** Runs the code layer again without editing it. */
  run(id: string): Promise<{ id: string; ok: boolean; error?: string; layers?: number }>
}

const hosts = new WeakMap<object, ScriptToolHost>()

/** Lets the `script` tool run for the documents of `owner`, a document's graph. */
export function registerScriptToolHost(owner: object, host: ScriptToolHost): () => void {
  hosts.set(owner, host)
  return () => {
    if (hosts.get(owner) === host) hosts.delete(owner)
  }
}

export function getScriptToolHost(owner: object): ScriptToolHost | undefined {
  return hosts.get(owner)
}
