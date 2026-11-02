import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ReportedAsset } from './artifacts.ts'
import { BUNDLE_NAME } from './catalog.ts'
import type { releaseCommands } from './commands.ts'

type PackCommands = Pick<
  ReturnType<typeof releaseCommands>,
  'zipApp' | 'extractDebian' | 'tarDirectory'
>

const TAR_GZ = '.tar.gz'

/**
 * Packs an archive Tauri does not bundle: the signed macOS app as a `.zip`, and on Linux the
 * Debian package's files as a `.tar.gz` with one top-level folder named after the archive.
 * The `.tar.gz` always holds `usr/lib/<productName>`, so a copy run from it never resolves its
 * resources to the installed package's and never takes the package's update.
 */
export async function packAsset(
  asset: ReportedAsset,
  output: string,
  commands: PackCommands
): Promise<string> {
  const archive = join(output, asset.name)

  if (asset.pack === 'zip') {
    await commands.zipApp(asset.source, archive)
    return archive
  }
  if (asset.pack !== 'tar.gz' || !asset.name.endsWith(TAR_GZ)) {
    throw new Error(`Not a packed archive: ${asset.name}`)
  }

  const temporary = await mkdtemp(join(tmpdir(), 'release-pack-'))
  try {
    const folder = asset.name.slice(0, -TAR_GZ.length)
    await commands.extractDebian(asset.source, join(temporary, folder))
    // Tauri resolves resources at `usr/lib/<productName>` beside `usr/bin` when that folder
    // exists, and at the system's `/usr/lib/<productName>` otherwise. Packing the folder lets
    // the app tell this copy from the installed package and skip the `.deb` update.
    await mkdir(join(temporary, folder, 'usr', 'lib', BUNDLE_NAME), { recursive: true })
    await commands.tarDirectory(temporary, folder, archive)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
  return archive
}
