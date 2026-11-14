import { discoverPublicPackages } from '@pairdraw/package-artifacts-tools'

export async function publicPackageDirs(root: string): Promise<string[]> {
  return (await discoverPublicPackages(root)).map(({ directory }) => directory)
}
