import { expect, test } from 'bun:test'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'

import { releaseCommands } from '#release/native/commands'
import { packAsset } from '#release/native/pack'

import type { CommandRequest } from '@pairdraw/package-artifacts-tools'

function recordingCommands() {
  const requests: CommandRequest[] = []
  const commands = releaseCommands('/checkout', async (request) => {
    requests.push(request)
    return { stdout: '', stderr: '' }
  })
  return { requests, commands }
}

test('zips the macOS app with ditto, keeping its signature and parent folder', async () => {
  const { requests, commands } = recordingCommands()

  const archive = await packAsset(
    { source: '/bundle/macos/Pairdraw.app', name: 'Pairdraw_0.16.0_aarch64.zip', pack: 'zip' },
    '/out',
    commands
  )

  expect(archive).toBe(join('/out', 'Pairdraw_0.16.0_aarch64.zip'))
  expect(requests.map(({ command, args }) => [command, args])).toEqual([
    [
      'ditto',
      [
        '-c',
        '-k',
        '--sequesterRsrc',
        '--keepParent',
        '/bundle/macos/Pairdraw.app',
        join('/out', 'Pairdraw_0.16.0_aarch64.zip')
      ]
    ]
  ])
})

test('packs the Debian package files under one folder named after the archive', async () => {
  const { requests, commands } = recordingCommands()

  await packAsset(
    {
      source: '/bundle/deb/Pairdraw_0.16.0_arm64.deb',
      name: 'Pairdraw_0.16.0_aarch64.tar.gz',
      pack: 'tar.gz'
    },
    '/out',
    commands
  )

  const [extract, tar] = requests
  expect(extract?.command).toBe('dpkg-deb')
  const extracted = extract?.args?.[2] ?? ''
  expect(extract?.args).toEqual(['-x', '/bundle/deb/Pairdraw_0.16.0_arm64.deb', extracted])
  expect(extracted.endsWith('Pairdraw_0.16.0_aarch64')).toBe(true)

  const parent = extracted.slice(0, -'/Pairdraw_0.16.0_aarch64'.length)
  expect(tar?.command).toBe('tar')
  expect(tar?.args).toEqual([
    '--owner=0',
    '--group=0',
    '--numeric-owner',
    '-czf',
    join('/out', 'Pairdraw_0.16.0_aarch64.tar.gz'),
    '-C',
    parent,
    'Pairdraw_0.16.0_aarch64'
  ])
  // The extraction folder is temporary.
  await expect(stat(parent)).rejects.toThrow()
})

test('packs the resource folder, so a copy run from the archive is not the installed package', async () => {
  let packedResources = false
  const commands = releaseCommands('/checkout', async ({ command, args = [] }) => {
    if (command === 'tar') {
      const [parent, folder] = args.slice(-2)
      const resources = await stat(join(parent ?? '', folder ?? '', 'usr', 'lib', 'Pairdraw'))
      packedResources = resources.isDirectory()
    }
    return { stdout: '', stderr: '' }
  })

  await packAsset(
    {
      source: '/bundle/deb/Pairdraw_0.16.0_amd64.deb',
      name: 'Pairdraw_0.16.0_amd64.tar.gz',
      pack: 'tar.gz'
    },
    '/out',
    commands
  )

  expect(packedResources).toBe(true)
})

test('refuses an asset that is not a packed archive', async () => {
  const { requests, commands } = recordingCommands()

  await expect(
    packAsset({ source: '/bundle/Pairdraw.dmg', name: 'Pairdraw.dmg' }, '/out', commands)
  ).rejects.toThrow('Not a packed archive')
  expect(requests).toEqual([])
})
