/** The capture format identifier that clipboard payloads and files carry. */
export const WEB_CAPTURE_FORMAT = 'openpencil/web-capture'

/** The capture format version this package writes and reads. */
export const WEB_CAPTURE_VERSION = 1

/** Elements one capture holds at most; a capturer stops descending once it reaches this. */
export const MAX_CAPTURE_ELEMENTS = 20_000

/** How deep a capture nests; deeper elements are left out, as browsers rarely draw them. */
export const MAX_CAPTURE_DEPTH = 256

/** Bytes one inlined image may take; a larger image stays a link the importer records. */
export const MAX_CAPTURE_IMAGE_BYTES = 8 * 1024 * 1024

/** Bytes all inlined images of a capture take together. */
export const MAX_CAPTURE_IMAGES_BYTES = 48 * 1024 * 1024

/** Characters of serialized capture JSON a reader accepts, images included. */
export const MAX_CAPTURE_JSON_LENGTH = 96 * 1024 * 1024

/** Characters of plain web HTML a paste styles; a larger fragment is refused. */
export const MAX_WEB_HTML_LENGTH = 8 * 1024 * 1024
