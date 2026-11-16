import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  discoverPublicPackages,
  orderPackagesByDependencies,
  preparePublishDirectories,
  readPackageManifest
} from '@pairdraw/package-artifacts-tools'

import { measurePhase } from '../timing'
import { verifyArtifactConsumers } from './consumer'
import { verifyPackagingGuards } from './guards'
import { packPublishDirectories } from './pack'

export async function verifyPackedPackages(root: string): Promise<void> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'pairdraw-package-smoke-'))
  try {
    // Broken fixture manifests must fail before the same checks vouch for real packages.
    await measurePhase('packaging guards', () => verifyPackagingGuards())
    const packages = orderPackagesByDependencies(await discoverPublicPackages(root))
    const { version } = await readPackageManifest(join(root, 'package.json'))
    const preparedRoot = join(temporaryRoot, 'prepared')
    // Pack what the release publishes: prepared manifests resolve dist under Bun and Node alike
    // and depend on the packed versions instead of workspace ranges.
    await measurePhase('publish preparation', () =>
      preparePublishDirectories({
        coreVersion: version,
        packages: packages.map(({ directory }) => ({ directory })),
        root,
        outRoot: preparedRoot
      })
    )
    const packageSet = await measurePhase('npm packing', () =>
      packPublishDirectories(preparedRoot, join(temporaryRoot, 'tarballs'), packages)
    )
    await verifyArtifactConsumers(root, packageSet.tarballs)
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}
