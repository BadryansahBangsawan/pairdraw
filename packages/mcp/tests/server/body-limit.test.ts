import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { request as httpRequest } from 'node:http'

import { MAX_REQUEST_BODY_BYTES } from '#mcp/http-options'
import { startServer, type ServerHandle } from '#mcp/server'

const TOKEN = 'body-limit-token'
let handle: ServerHandle

beforeEach(async () => {
  handle = await startServer({
    httpPort: 0,
    withTcp: true,
    socketPath: null,
    authToken: TOKEN,
    mcpRoot: null
  })
})

afterEach(async () => {
  await handle.close()
})

/**
 * Sends only the headers of a POST whose declared body is `length` bytes, so the answer shows
 * whether the server refused the body from its length or sat waiting to buffer it.
 */
function postHeaders(path: string, length: number, token: string | null): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port: handle.httpPort,
        method: 'POST',
        path,
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
          'content-length': String(length),
          ...(token ? { authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        res.resume()
        resolve(res.statusCode ?? 0)
        req.destroy()
      }
    )
    req.once('error', reject)
    req.flushHeaders()
  })
}

describe('request bodies', () => {
  for (const path of ['/rpc', '/mcp']) {
    test(`${path} refuses a body over the limit before reading it`, async () => {
      expect(await postHeaders(path, MAX_REQUEST_BODY_BYTES + 1, TOKEN)).toBe(413)
    })

    test(`${path} checks the token before the body, so a caller without one buffers nothing`, async () => {
      expect(await postHeaders(path, MAX_REQUEST_BODY_BYTES + 1, null)).toBe(401)
    })
  }
})
