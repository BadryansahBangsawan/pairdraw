import { expect, test } from 'bun:test'

import { createCloudTestDatabase } from '#cloud-tests/helpers/database'
import { createMemoryObjectStore } from '#cloud-tests/helpers/objects'
import {
  createCloudApp,
  createBetterAuthAdapter,
  parseCloudServerConfig,
  type CloudActor
} from '#cloud/server'

const config = parseCloudServerConfig({
  deployment: 'self-hosted',
  publicURL: 'http://localhost:8787',
  databaseURL: 'postgresql://test:test@localhost/test',
  authSecret: 'integration-test-secret-at-least-32-characters',
  s3Endpoint: 'http://localhost:9000',
  s3Region: 'us-east-1',
  s3Bucket: 'pairdraw',
  s3AccessKeyId: 'pairdraw',
  s3SecretAccessKey: 'pairdraw-secret'
})

const alice: CloudActor = { userId: crypto.randomUUID(), email: 'alice@example.com', name: 'Alice' }

/** A SHA-256 as the server names stored objects, so a route's body check passes. */
const CHECKSUM = `${'A'.repeat(43)}=`
const TOKEN = 'x'.repeat(32)
const UPLOAD_ID = crypto.randomUUID()

async function signedInApp(runtime: Awaited<ReturnType<typeof createCloudTestDatabase>>) {
  await runtime.database
    .insertInto('user')
    .values({
      id: alice.userId,
      name: alice.name,
      email: alice.email,
      emailVerified: true,
      image: null
    })
    .execute()
  return createCloudApp({
    config,
    database: runtime.database,
    auth: createBetterAuthAdapter(config, runtime.database),
    objects: createMemoryObjectStore().store,
    resolveSession: async () => alice
  })
}

test('malformed ids answer 4xx on every route that names a row', async () => {
  const runtime = await createCloudTestDatabase()
  try {
    const app = await signedInApp(runtime)
    const paths = [
      ['GET', '/api/workspaces/not-a-uuid'],
      ['PATCH', '/api/workspaces/not-a-uuid'],
      ['DELETE', '/api/workspaces/not-a-uuid'],
      ['GET', '/api/workspaces/not-a-uuid/members'],
      ['GET', '/api/workspaces/not-a-uuid/invitations'],
      ['GET', '/api/documents/not-a-uuid'],
      ['DELETE', '/api/documents/not-a-uuid'],
      ['GET', '/api/documents/not-a-uuid/versions'],
      ['GET', '/api/documents/not-a-uuid/shares'],
      ['POST', '/api/invitations/not-a-uuid/accept'],
      ['GET', '/api/invitations/not-a-uuid'],
      ['GET', '/api/documents/not-a-uuid/versions/not-a-uuid'],
      ['PATCH', '/api/documents/not-a-uuid/versions/not-a-uuid'],
      ['DELETE', '/api/documents/not-a-uuid/grants/not-a-uuid'],
      ['PATCH', '/api/workspaces/not-a-uuid/members/not-a-uuid'],
      ['DELETE', '/api/workspaces/not-a-uuid/members/not-a-uuid'],
      ['POST', '/api/workspaces/not-a-uuid/invitations/not-a-uuid/resend']
    ] as const
    const results: Record<string, number> = {}
    for (const [method, path] of paths) {
      const response = await app.request(path, {
        method,
        headers: { 'Content-Type': 'application/json', Origin: config.publicURL },
        body: method === 'POST' ? JSON.stringify({ token: 'x' }) : undefined
      })
      results[`${method} ${path}`] = response.status
    }
    for (const [key, status] of Object.entries(results)) {
      expect(status, key).toBeLessThan(500)
      if (!key.endsWith('/accept')) expect(status, key).toBe(404)
    }
  } finally {
    await runtime.close()
  }
})

/** A malformed id must be answered before the database, whatever the body carries. */
test('malformed ids answer 404 on the body-carrying routes', async () => {
  const runtime = await createCloudTestDatabase()
  try {
    const app = await signedInApp(runtime)
    const requests = [
      ['POST', '/api/workspaces/not-a-uuid/documents', { name: 'X' }],
      ['PATCH', '/api/documents/not-a-uuid/shares/not-a-uuid', {}],
      [
        'POST',
        '/api/documents/not-a-uuid/invitations',
        {
          email: 'bob@example.com',
          permission: 'view'
        }
      ],
      ['POST', '/api/documents/not-a-uuid/versions/not-a-uuid/duplicate', { name: 'v' }],
      ['POST', '/api/shares/not-a-uuid/resolve', { secret: TOKEN }],
      ['POST', '/api/invitations/not-a-uuid/preview', { token: TOKEN }],
      ['POST', '/api/invitations/not-a-uuid/accept', { token: TOKEN }],
      ['PUT', '/api/workspaces/not-a-uuid/public', { public: true }],
      ['POST', '/api/public/documents/not-a-uuid/document', undefined],
      ['POST', '/api/documents/not-a-uuid/collaboration-ticket', {}],
      ['POST', '/api/public/shares/not-a-uuid/collaboration-ticket', { secret: TOKEN }],
      [
        'POST',
        '/api/documents/not-a-uuid/images/commit',
        {
          uploads: [{ uploadId: UPLOAD_ID, checksum: CHECKSUM }]
        }
      ],
      ['POST', '/api/uploads/not-a-uuid/commit', { checksum: CHECKSUM }],
      ['POST', '/api/public/shares/not-a-uuid/document', { secret: TOKEN }],
      ['POST', '/api/public/shares/not-a-uuid/images', { secret: TOKEN, checksums: [CHECKSUM] }]
    ] as const
    const results: Record<string, number> = {}
    for (const [method, path, body] of requests) {
      const response = await app.request(path, {
        method,
        headers: { 'Content-Type': 'application/json', Origin: config.publicURL },
        body: body === undefined ? undefined : JSON.stringify(body)
      })
      results[`${method} ${path}`] = response.status
    }
    for (const [key, status] of Object.entries(results)) expect(status, key).toBe(404)
  } finally {
    await runtime.close()
  }
})
