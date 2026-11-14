import { afterEach, describe, expect, test } from 'bun:test'

import { normalizeCloudServerURL } from '@/app/cloud/servers/address'
import {
  addCloudServer,
  cloudServerForLink,
  cloudServers,
  homeCloudServer,
  isOfficialCloudURL,
  removeCloudServer,
  showCloudServerOnHome
} from '@/app/cloud/servers/store'

afterEach(() => {
  for (const server of cloudServers.value) removeCloudServer(server.id)
})

describe('Cloud server addresses', () => {
  test('read what people type as the server’s canonical address', () => {
    expect(normalizeCloudServerURL('cloud.example.com')).toBe('https://cloud.example.com')
    expect(normalizeCloudServerURL(' https://cloud.example.com/ ')).toBe(
      'https://cloud.example.com'
    )
    expect(normalizeCloudServerURL('http://localhost:8787/?x=1#y')).toBe('http://localhost:8787')
  })

  test('refuse what cannot be a server', () => {
    for (const input of [
      '',
      'ftp://cloud.example.com',
      'https://user:pass@cloud.example.com',
      // Its session token would cross the network in the clear.
      'http://cloud.example.com',
      'http://192.168.1.20:8787'
    ])
      expect(normalizeCloudServerURL(input)).toBeNull()
    expect(normalizeCloudServerURL('http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787')
  })
})

describe('Cloud servers', () => {
  test('get the same credential-safe id for the same address', async () => {
    const first = await addCloudServer({ kind: 'self-hosted', url: 'design.acme.example' })
    const again = await addCloudServer({ kind: 'self-hosted', url: 'https://design.acme.example/' })
    expect(again.id).toBe(first.id)
    expect(first.id).toMatch(/^[0-9a-f]{32}$/)
    expect(cloudServers.value).toHaveLength(1)
  })

  test('add a server once when two sign-ins for it overlap', async () => {
    const [first, second] = await Promise.all([
      addCloudServer({ kind: 'self-hosted', url: 'design.acme.example' }),
      addCloudServer({ kind: 'self-hosted', url: 'design.acme.example' })
    ])
    expect(second.id).toBe(first.id)
    expect(cloudServers.value).toHaveLength(1)
  })

  test('put the first server on Home and move Home on when it is removed', async () => {
    const first = await addCloudServer({ kind: 'self-hosted', url: 'cloud.example.com' })
    const team = await addCloudServer({ kind: 'self-hosted', url: 'design.acme.example' })
    expect(homeCloudServer.value?.id).toBe(first.id)
    showCloudServerOnHome(team.id)
    expect(homeCloudServer.value?.id).toBe(team.id)
    removeCloudServer(team.id)
    expect(homeCloudServer.value?.id).toBe(first.id)
  })

  test('know no official server in a build that names none', async () => {
    await expect(addCloudServer({ kind: 'official' })).rejects.toThrow()
    expect(isOfficialCloudURL('https://cloud.example.com')).toBe(false)
    // A link alone never connects the app to a server it does not know.
    expect(await cloudServerForLink('https://cloud.example.com')).toBeNull()
    expect(cloudServers.value).toHaveLength(0)
  })

  test('reject an address that cannot be a server', async () => {
    await expect(addCloudServer({ kind: 'self-hosted', url: 'ftp://nope' })).rejects.toThrow()
  })
})
