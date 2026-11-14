import { expect, test } from 'bun:test'

import { desktopAssets, desktopBuilds, desktopTargets } from '#release/native/catalog'

const VERSION = '0.16.0'
const published = desktopTargets.flatMap((target) => desktopAssets(target, VERSION))

test('builds Linux on ARM64 as well as x64', () => {
  expect(desktopBuilds.find((build) => build.target === 'aarch64-unknown-linux-gnu')).toEqual({
    target: 'aarch64-unknown-linux-gnu',
    platform: 'ubuntu-22.04-arm',
    label: 'linux-arm64',
    saveBunCache: true
  })
})

test('reads and publishes every file under the Pairdraw name', () => {
  for (const asset of published) {
    expect(asset.name).toStartWith('Pairdraw')
    expect(asset.source).toStartWith('Pairdraw')
  }
  expect(new Set(published.map((asset) => asset.name)).size).toBe(published.length)
})

test('Linux ARM64 ships an AppImage, Debian and RPM packages, and a tar.gz', () => {
  expect(
    desktopAssets('aarch64-unknown-linux-gnu', VERSION).map(({ source, name, pack }) => ({
      source,
      name,
      pack
    }))
  ).toEqual([
    {
      source: 'Pairdraw_0.16.0_aarch64.AppImage',
      name: 'Pairdraw_0.16.0_aarch64.AppImage',
      pack: undefined
    },
    { source: 'Pairdraw_0.16.0_arm64.deb', name: 'Pairdraw_0.16.0_arm64.deb', pack: undefined },
    {
      source: 'Pairdraw-0.16.0-1.aarch64.rpm',
      name: 'Pairdraw-0.16.0-1.aarch64.rpm',
      pack: undefined
    },
    {
      source: 'Pairdraw_0.16.0_arm64.deb',
      name: 'Pairdraw_0.16.0_aarch64.tar.gz',
      pack: 'tar.gz'
    }
  ])
})

test('every updater platform comes from exactly one signed file', () => {
  const keys = published.flatMap((asset) => asset.updaterKeys)
  expect(new Set(keys).size).toBe(keys.length)
  expect(keys).toEqual(
    expect.arrayContaining([
      'linux-aarch64',
      'linux-aarch64-appimage',
      'linux-aarch64-deb',
      'linux-aarch64-rpm',
      'linux-x86_64',
      'darwin-aarch64',
      'darwin-x86_64'
    ])
  )
  for (const asset of published) {
    if (asset.updaterKeys.length > 0) expect(asset.signed).toBe(true)
  }
})

test('packed archives are download-only: unsigned and never offered to the updater', () => {
  const archives = published.filter((asset) => asset.pack)
  expect(archives.map((asset) => asset.name)).toEqual([
    'Pairdraw_0.16.0_aarch64.zip',
    'Pairdraw_0.16.0_x64.zip',
    'Pairdraw_0.16.0_amd64.tar.gz',
    'Pairdraw_0.16.0_aarch64.tar.gz'
  ])
  for (const archive of archives) {
    expect(archive.signed).toBe(false)
    expect(archive.updaterKeys).toEqual([])
  }
})
