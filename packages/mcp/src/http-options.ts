import { bodyLimit } from 'hono/body-limit'

import { MAX_FILE_TRANSFER_BYTES } from '#mcp/tool/output'

export const MCP_CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']

/**
 * The largest body `/rpc` and `/mcp` read. Tool arguments carry files inline as Base64, such as
 * `set_image_fill`'s `image_data`, so a file as large as `/files` passes still fits, with room
 * for the rest of the request.
 */
export const MAX_REQUEST_BODY_BYTES = 2 * MAX_FILE_TRANSFER_BYTES

/**
 * Refuses a larger body, counted as it streams in, so one without Content-Length is bounded too.
 * Routes check the token before it, so a caller without one never makes the server buffer.
 */
export const limitBody = bodyLimit({
  maxSize: MAX_REQUEST_BODY_BYTES,
  onError: (c) => c.json({ error: 'Request is too large' }, 413)
})

// x-mcp-token: Pairdraw extension for MCP clients that cannot set the
// Authorization header (e.g. some IDE plugins). Not part of the MCP spec.
export const MCP_CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'x-mcp-token',
  'mcp-session-id',
  'Last-Event-ID',
  'mcp-protocol-version'
]

export const MCP_EXPOSED_HEADERS = ['mcp-session-id', 'mcp-protocol-version']
