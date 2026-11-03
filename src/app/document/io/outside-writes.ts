/**
 * Counts each document's writes that reach it outside its editor's history, such as a room's
 * changes from collaborators. An edit that awaits cannot tell them from its own, so it asks
 * whether any arrived before it rolls itself back.
 */
const outsideWrites = new WeakMap<object, number>()

/** Records that `document`, such as an editor store, was written outside its history. */
export function noteOutsideWrite(document: object): void {
  outsideWrites.set(document, (outsideWrites.get(document) ?? 0) + 1)
}

/** A check that stays true until `document` is written outside its history after this call. */
export function noOutsideWritesSince(document: object): () => boolean {
  const at = outsideWrites.get(document) ?? 0
  return () => (outsideWrites.get(document) ?? 0) === at
}
