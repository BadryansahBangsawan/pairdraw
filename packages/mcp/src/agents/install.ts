import { spawnFixed, terminate } from './process'

const INSTALL_TIMEOUT_MS = 120_000

// These are public packages; a person's private project registry may not mirror them.
const PUBLIC_REGISTRY = '--registry=https://registry.npmjs.org'

/** The npm arguments that install a package globally, the same the desktop shell scope pins. */
export function npmInstallArgs(packageName: string): string[] {
  return ['install', '--global', packageName, PUBLIC_REGISTRY]
}

/**
 * Installs an agent's adapter package globally with npm; rejects when npm did not finish. It
 * runs in the companion's workspace, so an `.npmrc` in the folder the companion started in
 * cannot point npm elsewhere.
 */
export type PackageInstaller = (
  packageName: string,
  searchPath: string,
  cwd: string
) => Promise<void>

export const installWithNpm: PackageInstaller = (packageName, searchPath, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawnFixed('npm', npmInstallArgs(packageName), {
      searchPath,
      cwd,
      stdio: ['ignore', 'ignore', 'ignore']
    })
    const timer = setTimeout(() => {
      void terminate(child)
      reject(new Error('The installation timed out.'))
    }, INSTALL_TIMEOUT_MS)
    child.once('error', () => {
      clearTimeout(timer)
      reject(new Error('The installation could not start.'))
    })
    child.once('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error('The installation failed.'))
    })
  })
