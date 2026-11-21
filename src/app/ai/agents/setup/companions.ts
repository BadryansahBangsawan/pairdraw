import { APP_VERSION } from '@/app/runtime/version'

/** Pairdraw's command-line tool; `pairdraw` is also the desktop app's own program on Linux. */
export const CLI_EXECUTABLE = 'pairdraw'
export const CLI_PACKAGE = '@pairdraw/cli'
export const CLI_INSTALL_TARGET = `${CLI_PACKAGE}@${APP_VERSION}`

function majorMinor(version: string): string | null {
  const match = /^(\d+)\.(\d+)/.exec(version)
  return match ? `${match[1]}.${match[2]}` : null
}

/**
 * Whether an installed Pairdraw companion (MCP server, Harness) is too old or new for this app.
 * Companions must match the app's major.minor version. One that reports no version predates
 * `--version`, which the desktop app asks every installed companion, so it is outdated too.
 */
export function isOutdatedCompanion(
  version: string | null | undefined,
  appVersion: string = APP_VERSION
): boolean {
  if (!version) return true
  return majorMinor(version) !== majorMinor(appVersion)
}

/** Pairdraw's packages installed beside the app: the MCP server, the CLI, and the Harness. */
export type Companion = 'mcp' | 'cli' | 'harness'

const BUN_GLOBAL_BIN = /[\\/]\.bun[\\/]/

export type PackageManager = 'npm' | 'bun'

/**
 * The package manager that installed a global companion. Updating it with another one would
 * leave the old copy first on PATH, so installs and commands follow this.
 */
export function companionPackageManager(executablePath?: string | null): PackageManager {
  return executablePath && BUN_GLOBAL_BIN.test(executablePath) ? 'bun' : 'npm'
}

/**
 * The command that installs a global package by hand. npm whose global folder needs
 * administrator rights runs through sudo on macOS and Linux; Windows keeps npm per user.
 */
export function globalInstallCommand(
  target: string,
  manager: PackageManager,
  options: { admin?: boolean; windows?: boolean } = {}
): string {
  if (manager === 'bun') return `bun add -g ${target}`
  const command = `npm i -g ${target}`
  return options.admin && !options.windows ? `sudo ${command}` : command
}
