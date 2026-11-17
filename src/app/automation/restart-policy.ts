/** How a server that died is started again: a growing wait, and a limit on the attempts. */
export interface RestartPolicyOptions {
  /** The wait before the first attempt. */
  baseMs?: number
  /** The longest wait between attempts. */
  limitMs?: number
  /** How many attempts are allowed before giving up. */
  attempts?: number
}

const BASE_MS = 500
const LIMIT_MS = 30_000
const ATTEMPTS = 5

/**
 * How long a server must stay up before a later stop counts as the first one.
 * Resetting on the healthy start itself never reaches the attempt limit: a server that
 * comes up and then dies is started again forever.
 */
export const RESTART_HEALTHY_RESET_MS = 60_000

/**
 * The wait before restart attempt `attempt` (counting from zero), or null when the attempts it is
 * allowed have been used: a server that keeps dying is reported to the person instead of being
 * started every second forever.
 */
export function restartDelay(attempt: number, options: RestartPolicyOptions = {}): number | null {
  const attempts = options.attempts ?? ATTEMPTS
  if (attempt >= attempts) return null
  const limitMs = options.limitMs ?? LIMIT_MS
  return Math.min(limitMs, (options.baseMs ?? BASE_MS) * 2 ** attempt)
}
