/** A save that did not land. The editor keeps this until a later save does. */
export type SaveFailure = { error: string }

/** Records a save failure for the document. The UI owns the wording and where it stays. */
export function reportSaveFailure(
  state: { saveFailure: SaveFailure | null },
  error: unknown
): void {
  state.saveFailure = { error: error instanceof Error ? error.message : String(error) }
}

/** Drops the failure notice after a save that replaced the document. */
export function clearSaveFailure(state: { saveFailure?: SaveFailure | null }): void {
  if (state.saveFailure != null) state.saveFailure = null
}
