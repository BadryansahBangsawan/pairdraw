/**
 * How long starting a coding agent may take before its chat says it is not starting. An agent
 * that starts but never answers `initialize` sends no event, so only a deadline ends the wait.
 */
export const AGENT_STARTUP_TIMEOUT_MS = 45_000

/** A coding agent that neither started nor exited in time. */
export class AgentStartupTimeoutError extends Error {
  constructor(waitedMs: number) {
    super(`The agent did not start within ${Math.round(waitedMs / 1000)} seconds.`)
    this.name = 'AgentStartupTimeoutError'
  }
}

/** Races a startup request against the agent's exit and the startup deadline. */
export function raceStartup<T>(
  request: Promise<T>,
  stopped: Promise<never>,
  timeoutMs = AGENT_STARTUP_TIMEOUT_MS
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const finish = (): void => clearTimeout(timer)
    const timer = setTimeout(() => {
      finish()
      reject(new AgentStartupTimeoutError(timeoutMs))
    }, timeoutMs)
    request.then(
      (value) => {
        finish()
        resolve(value)
      },
      (error: unknown) => {
        finish()
        reject(error)
      }
    )
    stopped.catch((error: unknown) => {
      finish()
      reject(error)
    })
  })
}
