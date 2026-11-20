import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'

import { CloudAPIError } from '@pairdraw/cloud/client'

import { cloudAIWorkspaces } from '@/app/cloud/ai/access'
import {
  addCloudServer,
  cloudServers,
  rememberCloudAccount,
  removeCloudServer
} from '@/app/cloud/servers/store'
import {
  cloudConnections,
  forgetCloudConnection,
  type CloudConnection
} from '@/app/cloud/sessions/connection'

import { cloudDiscoveryFixture } from '#tests/helpers/cloud/discovery'
import { asDouble } from '#tests/helpers/doubles'

const AI_DISCOVERY = {
  ...cloudDiscoveryFixture(),
  ai: { endpoint: 'https://cloud.example.com/ai', contractVersion: '1' as const }
}

const ENTITLEMENTS = {
  features: {
    links: true,
    guestView: true,
    guestEdit: true,
    guestPresence: true,
    collaboration: true,
    revisionHistory: true,
    cloudAI: true
  },
  limits: { maximumFileBytes: 1_048_576, maximumStorageBytes: null, maximumParticipants: null },
  usage: { committedStorageBytes: 0, reservedStorageBytes: 0 }
}

const ACCOUNT = { id: 'account', name: 'Ada', email: 'ada@example.com', image: null }

/** The workspace the server no longer finds: the account left it, or it was deleted. */
const LEFT = { id: '11111111-1111-4111-8111-111111111111', name: 'Left' }
const KEPT = { id: '22222222-2222-4222-8222-222222222222', name: 'Kept' }
const WORKSPACES = [
  { ...LEFT, slug: 'left', role: 'viewer' as const },
  { ...KEPT, slug: 'kept', role: 'editor' as const }
].map((workspace) => ({
  ...workspace,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}))

const CONNECTION: CloudConnection = {
  state: 'signed-in',
  discovery: AI_DISCOVERY,
  account: ACCOUNT,
  workspaces: WORKSPACES,
  failure: null
}

let serverId = ''
let restoreFetch: (() => void) | undefined

/** A signed-in Home server holding two workspaces; `answer` reads the one a request names. */
async function signedInHome(answer: (workspaceId: string) => Response): Promise<void> {
  const server = await addCloudServer({ kind: 'self-hosted', url: 'https://cloud.example.com' })
  serverId = server.id
  rememberCloudAccount(serverId, ACCOUNT)
  cloudConnections.value = { [serverId]: CONNECTION }
  const spy = spyOn(globalThis, 'fetch').mockImplementation(
    asDouble<typeof fetch>((input: URL | RequestInfo) => {
      const url = String(input instanceof Request ? input.url : input)
      return Promise.resolve(answer(url.match(/workspaces\/([^/]+)\/entitlements/)?.[1] ?? ''))
    })
  )
  restoreFetch = () => spy.mockRestore()
}

beforeEach(() => {
  cloudConnections.value = {}
})

afterEach(() => {
  restoreFetch?.()
  restoreFetch = undefined
  for (const server of cloudServers.value) removeCloudServer(server.id)
  forgetCloudConnection(serverId)
  cloudConnections.value = {}
})

describe('workspaces whose plan includes AI', () => {
  test('skips a workspace the server no longer finds, and lists the rest', async () => {
    await signedInHome((workspaceId) =>
      workspaceId === LEFT.id
        ? Response.json({ error: { code: 'not_found' } }, { status: 404 })
        : Response.json({ entitlements: ENTITLEMENTS })
    )

    expect(await cloudAIWorkspaces()).toEqual([{ id: KEPT.id, name: KEPT.name }])
  })

  test('rejects when a workspace fails for another reason', async () => {
    await signedInHome(() => Response.json({ error: { code: 'server_error' } }, { status: 500 }))

    const failure = await cloudAIWorkspaces().then(
      () => null,
      (error: unknown) => error
    )
    expect(failure).toBeInstanceOf(CloudAPIError)
    expect((failure as CloudAPIError).status).toBe(500)
  })
})
