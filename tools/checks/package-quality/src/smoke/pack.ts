import { mkdir } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { basename, join } from 'node:path'

import { mapAsync } from 'es-toolkit'

import { parseNpmPack, runCommand, type WorkspacePackage } from '@pairdraw/package-artifacts-tools'
import { inspectTarball, type TarballInspection } from '@pairdraw/package-artifacts-tools/tarball'

export interface PackedPackageSet {
  inspections: TarballInspection[]
  packages: WorkspacePackage[]
  tarballs: string[]
}

/**
 * Packs the publish directories `preparePublishDirectories` wrote under `preparedRoot` with the
 * `npm pack` the release uses, so the checks see the manifests npm receives rather than the
 * workspace ones, whose `bun` conditions send an installed copy to its source.
 */
export async function packPublishDirectories(
  preparedRoot: string,
  outputDirectory: string,
  packages: WorkspacePackage[]
): Promise<PackedPackageSet> {
  await mkdir(outputDirectory, { recursive: true })
  // Packing reads only its own package, so packages pack side by side; tarballs keep their order.
  // Every pack settles before a failure is reported, so none writes into a removed directory.
  const outcomes = await mapAsync(
    packages,
    async (pkg) => {
      try {
        const result = await runCommand({
          command: 'npm',
          args: ['pack', '--json', '--ignore-scripts', '--pack-destination', outputDirectory],
          cwd: join(preparedRoot, basename(pkg.directory)),
          timeoutMs: 60_000
        })
        return join(outputDirectory, parseNpmPack(result.stdout).filename)
      } catch (error) {
        return error instanceof Error ? error : new Error(String(error))
      }
    },
    { concurrency: availableParallelism() }
  )
  const failures = outcomes.filter((outcome) => outcome instanceof Error)
  if (failures.length > 0) {
    throw new AggregateError(failures, failures.map(({ message }) => message).join('\n'))
  }
  const tarballs = outcomes.filter((outcome) => typeof outcome === 'string')
  const inspections = await Promise.all(tarballs.map(inspectTarball))
  const diagnostics = inspections.flatMap(({ diagnostics }) => diagnostics)
  if (diagnostics.length > 0) {
    throw new Error(
      diagnostics
        .map(({ packageName, field, message }) => `${packageName}: ${field} ${message}`)
        .join('\n')
    )
  }
  return { inspections, packages, tarballs }
}
