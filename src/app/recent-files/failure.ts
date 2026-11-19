/**
 * Whether an open was cancelled rather than failing, because its tab closed while the document
 * was loading or its picker was dismissed. Nothing was learned about the file, so it is neither
 * reported as a failure nor forgotten: its recent entry stays and can be opened again.
 */
export function isCancelledOpen(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
