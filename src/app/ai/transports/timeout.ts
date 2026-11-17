/**
 * How long a reply waits on the provider before its turn ends with a timeout failure. A provider
 * that stops sending without closing the stream is the one failure no event reports.
 */
export type ProviderTimeouts = {
  /** Until the first content chunk of a step. */
  firstChunkMs: number
  /** Between two content chunks of a step. */
  chunkMs: number
}

export const providerTimeouts: ProviderTimeouts = {
  firstChunkMs: 120_000,
  chunkMs: 60_000
}
