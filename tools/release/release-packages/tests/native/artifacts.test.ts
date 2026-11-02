import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { resolveReportedAssets } from '#release/native/artifacts'
import { desktopAssets, type DesktopAsset } from '#release/native/catalog'

const expected = desktopAssets('aarch64-apple-darwin', '0.15.0')

/** Writes what tauri-action reports: each bundle once, the macOS app as a directory. */
async function withArtifacts(
  run: (root: string, reported: string[]) => Promise<void>,
  assets: readonly DesktopAsset[] = expected
) {
  const root = await mkdtemp(join(tmpdir(), 'release-artifacts-'))

  try {
    const reported = new Set<string>()

    for (const asset of assets) {
      for (const name of asset.signed ? [asset.source, `${asset.source}.sig`] : [asset.source]) {
        const path = join(root, name)
        if (reported.has(path)) continue
        if (name.endsWith('.app')) {
          await mkdir(join(path, 'Contents'), { recursive: true })
          await writeFile(join(path, 'Contents', 'Info.plist'), 'fixture')
        } else {
          await writeFile(path, 'fixture')
        }
        reported.add(path)
      }
    }

    await run(root, [...reported])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('uses reported paths and packs the reported macOS app as a zip', () =>
  withArtifacts(async (root, reported) => {
    await writeFile(join(root, 'unrelated-file.dmg'), 'not reported')

    const assets = await resolveReportedAssets(reported, expected, root)

    expect(assets.map((asset) => asset.name).sort()).toEqual([
      'Pairdraw_0.15.0_aarch64.dmg',
      'Pairdraw_0.15.0_aarch64.zip',
      'Pairdraw_aarch64.app.tar.gz',
      'Pairdraw_aarch64.app.tar.gz.sig'
    ])
    const zip = assets.find((asset) => asset.name.endsWith('.zip'))
    expect(zip?.pack).toBe('zip')
    expect(zip?.source.endsWith('OpenPencil.app')).toBe(true)
    expect(assets.filter((asset) => asset.pack)).toHaveLength(1)
  }))

test('publishes the Linux Debian package and packs its files from the same report', async () => {
  const linux = desktopAssets('aarch64-unknown-linux-gnu', '0.15.0')

  await withArtifacts(async (root, reported) => {
    const assets = await resolveReportedAssets(reported, linux, root)

    expect(assets.map((asset) => asset.name).sort()).toEqual([
      'Pairdraw-0.15.0-1.aarch64.rpm',
      'Pairdraw-0.15.0-1.aarch64.rpm.sig',
      'Pairdraw_0.15.0_aarch64.AppImage',
      'Pairdraw_0.15.0_aarch64.AppImage.sig',
      'Pairdraw_0.15.0_aarch64.tar.gz',
      'Pairdraw_0.15.0_arm64.deb',
      'Pairdraw_0.15.0_arm64.deb.sig'
    ])
    const deb = assets.find((asset) => asset.name === 'Pairdraw_0.15.0_arm64.deb')
    const archive = assets.find((asset) => asset.name === 'Pairdraw_0.15.0_aarch64.tar.gz')
    expect(archive?.pack).toBe('tar.gz')
    expect(archive?.source).toBe(deb?.source ?? '')
  }, linux)
})

test('requires the macOS app the zip is packed from', () =>
  withArtifacts(async (root, reported) => {
    await expect(
      resolveReportedAssets(
        reported.filter((path) => !path.endsWith('.app')),
        expected,
        root
      )
    ).rejects.toThrow('Missing reported artifacts: Pairdraw_0.15.0_aarch64.zip')
  }))

test('ignores a reported app directory no archive is packed from', async () => {
  const windows = desktopAssets('x86_64-pc-windows-msvc', '0.15.0')

  await withArtifacts(async (root, reported) => {
    const app = join(root, 'OpenPencil.app')
    await mkdir(app)

    const assets = await resolveReportedAssets([...reported, app], windows, root)

    expect(assets).toHaveLength(4)
  }, windows)
})

test('does not discover an existing signature missing from the action output', () =>
  withArtifacts(async (root, reported) => {
    await expect(
      resolveReportedAssets(
        reported.filter((path) => !path.endsWith('.sig')),
        expected,
        root
      )
    ).rejects.toThrow('Missing reported artifacts')
  }))

test('rejects duplicate reports', () =>
  withArtifacts(async (root, reported) => {
    await expect(resolveReportedAssets([...reported, ...reported], expected, root)).rejects.toThrow(
      'Duplicate reported artifact'
    )
  }))

test('rejects additional reported files', () =>
  withArtifacts(async (root, reported) => {
    const extra = join(root, 'unexpected.exe')
    await writeFile(extra, 'fixture')

    await expect(resolveReportedAssets([...reported, extra], expected, root)).rejects.toThrow(
      'Unexpected reported artifact'
    )
  }))

test('rejects empty reported files', () =>
  withArtifacts(async (root, reported) => {
    const dmg = reported.find((path) => path.endsWith('.dmg')) ?? ''
    await writeFile(dmg, '')

    await expect(resolveReportedAssets(reported, expected, root)).rejects.toThrow(
      'Empty reported artifact: Pairdraw_0.15.0_aarch64.dmg'
    )
  }))

test('rejects symlink escapes', () =>
  withArtifacts(async (root, reported) => {
    const source = join(root, 'source')
    await mkdir(source)
    const dmg = reported.find((path) => path.endsWith('.dmg')) ?? ''
    await symlink(dmg, join(source, 'outside.dmg'))

    await expect(
      resolveReportedAssets([join(source, 'outside.dmg')], expected, source)
    ).rejects.toThrow('escapes source checkout')
  }))
