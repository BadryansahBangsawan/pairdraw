/**
 * The embed protocol a host page speaks with the editor in its iframe. The handshake is the only
 * message that crosses `window.postMessage`; everything after it goes over the `MessagePort` the
 * host hands over, so no other frame or window can reach the session.
 *
 * Handshake: the embed posts `{ protocol, type: 'ready', version }` to its parent, addressed to the
 * origin its URL names, and the host answers with `{ protocol, type: 'connect', version }`,
 * transferring one port. Requests on the port are `{ id, method, params }` and get exactly one
 * `{ id, ok: true, result }` or `{ id, ok: false, error }`; events are `{ event, data }`.
 */
export const EMBED_PROTOCOL = 'openpencil-embed'
export const EMBED_PROTOCOL_VERSION = 1

/** Longest request ID the embed echoes back, so a host cannot make it copy large strings. */
export const MAX_EMBED_REQUEST_ID_LENGTH = 128
/** Most layers a single `select` or `export` request may name. */
export const MAX_EMBED_NODE_IDS = 1000
/** The scale range an image export accepts, as the export panel offers. */
export const MIN_EMBED_EXPORT_SCALE = 0.1
export const MAX_EMBED_EXPORT_SCALE = 4

export const EMBED_METHODS = [
  'load',
  'getDocument',
  'getPages',
  'setPage',
  'getSelection',
  'select',
  'zoomToFit',
  'exportImage',
  'setEditable'
] as const

/** The document formats `getDocument` writes: a `.fig` archive, or `.pen` text. */
export const EMBED_DOCUMENT_FORMATS = ['fig', 'pen'] as const
export type EmbedDocumentFormat = (typeof EMBED_DOCUMENT_FORMATS)[number]

export const EMBED_IMAGE_FORMATS = ['PNG', 'JPG', 'WEBP'] as const
export type EmbedImageFormat = (typeof EMBED_IMAGE_FORMATS)[number]

/** Why a request failed, stable for hosts to branch on; `message` is for people. */
type EmbedErrorCode =
  | 'invalid-request'
  | 'unknown-method'
  | 'edit-not-allowed'
  | 'no-document'
  | 'not-found'
  | 'too-large'
  | 'failed'

export interface EmbedError {
  code: EmbedErrorCode
  message: string
}

export type EmbedRequestId = string | number

export type EmbedResponse =
  | { id: EmbedRequestId; ok: true; result: unknown }
  | { id: EmbedRequestId; ok: false; error: EmbedError }

interface EmbedEvents {
  /** Sent once, first on the port, when the handshake is accepted. */
  connected: { version: number; editable: boolean; allowEdit: boolean }
  documentload: { name: string }
  /** The document was edited; sent at most a few times a second. */
  documentchange: { name: string }
  selectionchange: { nodeIds: string[] }
  pagechange: { pageId: string }
  editablechange: { editable: boolean }
}
type EmbedEventName = keyof EmbedEvents
export type EmbedEventMessage = {
  [K in EmbedEventName]: { event: K; data: EmbedEvents[K] }
}[EmbedEventName]

/** A request failure the session reports with its code rather than as `failed`. */
export class EmbedRequestError extends Error {
  readonly code: EmbedErrorCode
  constructor(code: EmbedErrorCode, message: string) {
    super(message)
    this.name = 'EmbedRequestError'
    this.code = code
  }
}
