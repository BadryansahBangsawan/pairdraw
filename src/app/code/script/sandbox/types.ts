/** The most layers one script may draw, and the time the host gives it before it gives up. */
export const SCRIPT_MAX_NODES = 1_000
export const SCRIPT_DEFAULT_TIMEOUT_MS = 2_000
export const SCRIPT_DEFAULT_READY_TIMEOUT_MS = 5_000

/** What a run produced, once the host has checked the layers: the sandbox's public result. */
export type ScriptSandboxResult = { ok: true; roots: unknown[] } | { ok: false; error: string }
