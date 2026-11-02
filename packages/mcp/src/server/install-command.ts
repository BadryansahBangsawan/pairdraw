import { resolveCommand } from 'package-manager-detector/commands'
import { detect, getUserAgent } from 'package-manager-detector/detect'

let installCommandPromise: Promise<string> | null = null

async function resolveMCPInstallCommand(version: string): Promise<string> {
  const agent =
    getUserAgent() ??
    (
      await detect({
        strategies: ['install-metadata', 'lockfile', 'packageManager-field', 'devEngines-field']
      })
    )?.agent ??
    'npm'
  const resolved = resolveCommand(agent, 'global', [`@open-pencil/mcp@${version}`])
  if (!resolved) return `npm install -g @open-pencil/mcp@${version}`
  return [resolved.command, ...resolved.args].join(' ')
}

/** How to install this server version globally with the package manager that runs it. */
export function mcpInstallCommand(version: string): Promise<string> {
  installCommandPromise ??= resolveMCPInstallCommand(version)
  return installCommandPromise
}
