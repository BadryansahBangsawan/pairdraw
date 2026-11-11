import { createCloudTestDatabase } from '#cloud-tests/helpers/database'
import { createMemoryObjectStore } from '#cloud-tests/helpers/objects'
import { responseJSON } from '#cloud-tests/helpers/response'
import {
  CLOUD_FEATURE_KEYS,
  createBetterAuthAdapter,
  createCloudApp,
  createDefaultCloudPolicy,
  EntitlementOpenFeatureProvider,
  parseCloudServerConfig,
  StaticEntitlementSource,
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
  s3Bucket: 'openpencil',
  s3AccessKeyId: 'openpencil',
  s3SecretAccessKey: 'openpencil-secret'
})

export const OWNER: CloudActor = {
  userId: '5b4cfa52-0f0e-4f43-9d4c-8b8f2a4f9a01',
  email: 'owner@example.com',
  name: 'Ada'
}

const SAVED_BYTES = 256
const currentRevisionSchema = v.object({
  document: v.object({ id: v.string(), currentRevisionId: v.nullable(v.string()) })
})

/** A plan that allows links, guests, and rooms, with any of them overridden. */
function sharingPlan(overrides: Record<string, boolean> = {}) {
  return createDefaultCloudPolicy(
    new EntitlementOpenFeatureProvider(
      new StaticEntitlementSource({
        [CLOUD_FEATURE_KEYS.links]: true,
        [CLOUD_FEATURE_KEYS.guestView]: true,
        [CLOUD_FEATURE_KEYS.guestEdit]: true,
        [CLOUD_FEATURE_KEYS.guestPresence]: true,
        [CLOUD_FEATURE_KEYS.collaboration]: true,
        [CLOUD_FEATURE_KEYS.revisionHistory]: true,
        ...overrides
      })
    )
  )
}

/**
 * A Cloud app on PGlite whose requests come from `session.actor` (null for someone signed out),
 * on `sharingPlan()` unless `plan` overrides some of it, with one workspace and one document
 * `OWNER` made, and `save()` committing a new revision of it.
 */
export async function createSavingCloudApp(options: { plan?: Record<string, boolean> } = {}) {
  const runtime = await createCloudTestDatabase()
  const objects = createMemoryObjectStore()
  const session: { actor: CloudActor | null } = { actor: OWNER }
  await runtime.database
    .insertInto('user')
    .values({ id: OWNER.userId, name: OWNER.name, email: OWNER.email, emailVerified: true })
    .execute()
  const app = createCloudApp({
    config,
    database: runtime.database,
    auth: createBetterAuthAdapter(config, runtime.database),
    objects: objects.store,
    policy: sharingPlan(options.plan),
    resolveSession: async () => session.actor
  })
  const request = (path: string, init: { method?: string; json?: unknown } = {}) =>
    app.request(`/api${path}`, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: init.json === undefined ? undefined : JSON.stringify(init.json)
    })
  const workspace = await responseJSON(
    await request('/workspaces', { method: 'POST', json: { name: 'Studio' } }),
    v.object({ workspace: v.object({ id: v.string() }) })
  )
  const created = await responseJSON(
    await request(`/workspaces/${workspace.workspace.id}/documents`, {
      method: 'POST',
      json: { name: 'Poster' }
    }),
    currentRevisionSchema
  )
  const documentId = created.document.id
  let current: string | null = null
  let saves = 0

  /** Commits a new revision as the editor does, through an upload. */
  async function save(): Promise<string> {
    saves++
    const checksum = `${String.fromCharCode(96 + saves).repeat(43)}=`
    const upload = await responseJSON(
      await request(`/documents/${documentId}/uploads`, {
        method: 'POST',
        json: {
          baseRevisionId: current,
          byteSize: SAVED_BYTES,
          checksum,
          contentType: 'application/octet-stream'
        }
      }),
      v.object({ id: v.string() })
    )
    const { objectKey } = await runtime.database
      .selectFrom('upload')
      .select('objectKey')
      .where('id', '=', upload.id)
      .executeTakeFirstOrThrow()
    objects.put(objectKey, {
      byteSize: SAVED_BYTES,
      checksum,
      checksumVerification: 'native',
      contentType: 'application/octet-stream'
    })
    const committed = await responseJSON(
      await request(`/uploads/${upload.id}/commit`, { method: 'POST', json: { checksum } }),
      currentRevisionSchema
    )
    current = committed.document.currentRevisionId
    if (!current) throw new Error('The save left no revision')
    return current
  }

  return {
    runtime,
    objects,
    session,
    request,
    workspaceId: workspace.workspace.id,
    documentId,
    save
  }
}
