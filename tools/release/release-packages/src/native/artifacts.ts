import { realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'

import * as v from 'valibot'

import type { ArchiveFormat, DesktopAsset } from './catalog.ts'

export interface ReportedAsset {
  source: string
  name: string
  /** Packed from `source` instead of copied. */
  pack?: ArchiveFormat
}

interface WantedAsset {
  name: string
  pack?: ArchiveFormat
}

/** Consume tauri-action's artifactPaths output, never search for plausible build files. */
export async function resolveReportedAssets(
  input: unknown,
  expected: readonly DesktopAsset[],
  root: string
): Promise<ReportedAsset[]> {
  const paths = v.parse(v.array(v.string()), input)
  const sourceRoot = await realpath(root)
  // One reported bundle can be both published and packed, as the Debian package is on Linux.
  const wanted = new Map<string, WantedAsset[]>()

  function want(source: string, asset: WantedAsset) {
    wanted.set(source, [...(wanted.get(source) ?? []), asset])
  }

  for (const asset of expected) {
    want(asset.source, asset.pack ? { name: asset.name, pack: asset.pack } : { name: asset.name })

    if (asset.signed) want(`${asset.source}.sig`, { name: `${asset.name}.sig` })
  }

  const found = new Map<string, ReportedAsset>()

  for (const path of paths) {
    const source = await realpath(resolve(sourceRoot, path))
    const local = relative(sourceRoot, source)

    if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) {
      throw new Error('Reported artifact escapes source checkout')
    }

    const info = await stat(source)
    const assets = wanted.get(basename(source))

    if (info.isDirectory() && source.endsWith('.app')) {
      // tauri-action also reports the macOS .app directory; only a packed archive is made from it.
      if (!assets?.every((asset) => asset.pack)) continue
    } else if (!info.isFile()) {
      throw new Error(`Not an artifact file: ${path}`)
    }

    if (!assets) throw new Error(`Unexpected reported artifact: ${path}`)

    for (const asset of assets) {
      if (found.has(asset.name)) throw new Error(`Duplicate reported artifact: ${asset.name}`)
      if (info.isFile() && info.size === 0) {
        throw new Error(`Empty reported artifact: ${asset.name}`)
      }
      found.set(asset.name, { source, ...asset })
    }
  }

  const missing = [...wanted.values()]
    .flat()
    .map((asset) => asset.name)
    .filter((name) => !found.has(name))
  if (missing.length > 0) throw new Error(`Missing reported artifacts: ${missing.join(', ')}`)

  return [...found.values()]
}
