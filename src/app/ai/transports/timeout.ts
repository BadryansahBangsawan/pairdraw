/**
 * How long a reply waits on the provider before its turn ends with a timeout failure. A provider
 * that stops sending without closing the stream is the one failure no event reports.
 */
export type ProviderTimeouts = {
  /** Until the first content chunk of a step, which a reasoning model may take minutes to send. */
  firstChunkMs: number
  /**
   * Between two content chunks of a step. A slow tool, such as generating an image, sends nothing
   * while it runs, so this stays generous; only a reply that truly stopped sending reaches it.
   */
  chunkMs: number
}

export const providerTimeouts: ProviderTimeouts = {
  firstChunkMs: 180_000,
  chunkMs: 120_000
}
