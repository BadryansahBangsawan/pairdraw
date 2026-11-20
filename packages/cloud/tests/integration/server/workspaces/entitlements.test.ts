import { describe, expect, test } from 'bun:test'

import { createCloudTestDatabase } from '#cloud-tests/helpers/database'
import { createMemoryObjectStore } from '#cloud-tests/helpers/objects'
import { responseJSON } from '#cloud-tests/helpers/response'
import {
  createCloudApp,
  createBetterAuthAdapter,
  parseCloudServerConfig,
  type CloudActor
} from '#cloud/server'
import * as v from 'valibot'

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
const bob: CloudActor = { userId: crypto.randomUUID(), email: 'bob@example.com', name: 'Bob' }

async function appFor(
  actor: CloudActor,
  database: Awaited<ReturnType<typeof createCloudTestDatabase>>['database']
) {
  const app = createCloudApp({
    config,
    database,
    auth: createBetterAuthAdapter(config, database),
    objects: createMemoryObjectStore().store,
    resolveSession: async () => actor
  })
  return (path: string, init?: { method?: string; json?: unknown }) =>
    app.request(path, {
      method: init?.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', Origin: config.publicURL },
      body: init?.json === undefined ? undefined : JSON.stringify(init.json)
    })
}

describe('workspace entitlements routes', () => {
  test('answers 404 for a workspace the account is not in, and for an unknown one', async () => {
    const runtime = await createCloudTestDatabase()
    try {
      await runtime.database
        .insertInto('user')
        .values([
          {
            id: alice.userId,
            name: alice.name,
            email: alice.email,
            emailVerified: true,
            image: null
          },
          { id: bob.userId, name: bob.name, email: bob.email, emailVerified: true, image: null }
        ])
        .execute()
      const bobApp = await appFor(bob, runtime.database)
      const aliceApp = await appFor(alice, runtime.database)
      const created = await responseJSON(
        await bobApp('/api/workspaces', { method: 'POST', json: { name: 'Bob' } }),
        v.object({ workspace: v.object({ id: v.string() }) })
      )
      const outsider = await aliceApp(`/api/workspaces/${created.workspace.id}/entitlements`)
      expect(outsider.status).toBe(404)
      const unknown = await aliceApp(
        '/api/workspaces/00000000-0000-4000-8000-000000000000/entitlements'
      )
      expect(unknown.status).toBe(404)
      const malformed = await aliceApp('/api/workspaces/not-a-uuid/entitlements')
      expect(malformed.status).toBe(404)
      expect(await outsider.json()).toEqual({ error: { code: 'not_found' } })
    } finally {
      await runtime.close()
    }
  })
})
