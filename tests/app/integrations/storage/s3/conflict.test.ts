import { expect, spyOn, test } from 'bun:test'

import { StorageRevisionConflictError } from '@/app/integrations/storage/errors'
import { documentFigKey, documentMetaKey } from '@/app/integrations/storage/namespace'
import { createS3StorageAdapter } from '@/app/integrations/storage/s3/adapter'
import { xhrHeaders } from '@/app/integrations/storage/s3/client'

import { fetchStub } from '#tests/helpers/fetch'

const META = { name: 'Document', updatedAt: '2026-01-01T00:00:00.000Z' }
const PRECONDITION_FAILED =
  '<?xml version="1.0"?><Error><Code>PreconditionFailed</Code><Message>At least one of the pre-conditions you specified did not hold</Message></Error>'

function storage() {
  return createS3StorageAdapter({
    profileId: 'default',
    preferences: {
      endpoint: 'https://storage.example.com',
      bucket: 'designs',
      region: 'auto'
    },
    async resolveCredential() {
      return 'secret'
    }
  })
}

interface RecordedRequest {
  method: string
  url: string
  ifMatch: string | null
}

/** Runs `run` with every S3 request answered by `respond`, recording what was asked. */
async function withS3(
  respond: (request: Request) => Response,
  run: (requests: RecordedRequest[]) => Promise<void>
): Promise<void> {
  const requests: RecordedRequest[] = []
  const stub = spyOn(globalThis, 'fetch').mockImplementation(
    fetchStub(async (input, init) => {
      const request =
        input instanceof Request
          ? input
          : new Request(String(input), init as RequestInit | undefined)
      requests.push({
        method: request.method,
        url: request.url,
        ifMatch: request.headers.get('if-match')
      })
      return respond(request)
    })
  )
  try {
    await run(requests)
  } finally {
    stub.mockRestore()
  }
}

test('a download reports the object’s ETag as its revision', async () => {
  await withS3(
    (request) =>
      request.method === 'GET'
        ? new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { ETag: '"v1"' } })
        : new Response(null, { status: 200 }),
    async () => {
      const document = await storage().getDocument('doc-1')
      expect(document.revision).toBe('"v1"')
      expect([...document.bytes]).toEqual([1, 2, 3])
    }
  )
})

test('a save sends the base revision and returns the new one', async () => {
  await withS3(
    () => new Response(null, { status: 200, headers: { ETag: '"v2"' } }),
    async (requests) => {
      const saved = await storage().putDocument('doc-1', new Uint8Array([1]), META, undefined, {
        baseRevision: '"v1"'
      })

      expect(saved.revision).toBe('"v2"')
      const puts = requests.filter((request) => request.method === 'PUT')
      expect(puts.map((request) => request.url)).toEqual([
        expect.stringContaining(documentFigKey('doc-1')),
        expect.stringContaining(documentMetaKey('doc-1'))
      ])
      expect(puts[0].ifMatch).toBe('"v1"')
      expect(puts[1].ifMatch).toBeNull()
    }
  )
})

test('a 412 is a revision conflict naming the stored revision', async () => {
  await withS3(
    (request) =>
      request.method === 'PUT'
        ? new Response(PRECONDITION_FAILED, { status: 412 })
        : new Response(null, { status: 200, headers: { ETag: '"v9"' } }),
    async () => {
      const saving = storage().putDocument('doc-1', new Uint8Array([1]), META, undefined, {
        baseRevision: '"v1"'
      })
      const failure = await saving.then(
        () => null,
        (error: unknown) => error
      )
      if (!(failure instanceof StorageRevisionConflictError))
        throw new Error('Expected a revision conflict')
      expect(failure.currentRevision).toBe('"v9"')
    }
  )
})

test('a provider without conditional writes falls back and remembers it', async () => {
  const conditionals: Array<string | null> = []
  await withS3(
    (request) => {
      if (request.method !== 'PUT' || !request.url.includes(documentFigKey('doc-1')))
        return new Response(null, { status: 200, headers: { ETag: '"v2"' } })
      const ifMatch = request.headers.get('if-match')
      conditionals.push(ifMatch)
      if (ifMatch) return new Response(PRECONDITION_FAILED, { status: 501 })
      return new Response(null, { status: 200, headers: { ETag: '"v2"' } })
    },
    async () => {
      const adapter = storage()
      const first = await adapter.putDocument('doc-1', new Uint8Array([1]), META, undefined, {
        baseRevision: '"v1"'
      })
      expect(first.revision).toBe('"v2"')
      expect(conditionals).toEqual(['"v1"', null])

      await adapter.putDocument('doc-1', new Uint8Array([2]), META, undefined, {
        baseRevision: '"v2"'
      })
      expect(conditionals).toEqual(['"v1"', null, null])
    }
  )
})

test('an upload response keeps the headers it received', () => {
  const headers = xhrHeaders('ETag: "v3"\r\ncontent-type: application/octet-stream\r\n\r\n')
  expect(headers.get('etag')).toBe('"v3"')
  expect(headers.get('content-type')).toBe('application/octet-stream')
})
