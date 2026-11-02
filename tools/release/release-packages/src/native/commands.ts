import { runCommand } from '@open-pencil/package-artifacts-tools'

const METADATA_TIMEOUT_MS = 60_000
export const ARTIFACT_TRANSFER_TIMEOUT_MS = 15 * 60_000
export const ARCHIVE_PACK_TIMEOUT_MS = 5 * 60_000

/** Release-specific command defaults; shared tooling owns spawning and diagnostics. */
export function releaseCommands(cwd: string, execute = runCommand) {
  async function git(...args: string[]): Promise<string> {
    const result = await execute({ command: 'git', args, cwd, timeoutMs: METADATA_TIMEOUT_MS })

    return result.stdout.trim()
  }

  async function github(args: string[], timeoutMs = METADATA_TIMEOUT_MS): Promise<string> {
    const result = await execute({ command: 'gh', args, cwd, timeoutMs })

    return result.stdout
  }

  async function verifySignature(artifact: string, publicKey: string, signature: string) {
    await execute({
      command: 'minisign',
      args: ['-Vm', artifact, '-p', publicKey, '-x', signature],
      cwd,
      output: 'inherit',
      timeoutMs: METADATA_TIMEOUT_MS
    })
  }

  /** `ditto` keeps the code signature, stapled ticket, and symlinks of a macOS app bundle. */
  async function zipApp(app: string, archive: string) {
    await execute({
      command: 'ditto',
      args: ['-c', '-k', '--sequesterRsrc', '--keepParent', app, archive],
      cwd,
      output: 'inherit',
      timeoutMs: ARCHIVE_PACK_TIMEOUT_MS
    })
  }

  async function extractDebian(deb: string, directory: string) {
    await execute({
      command: 'dpkg-deb',
      args: ['-x', deb, directory],
      cwd,
      output: 'inherit',
      timeoutMs: ARCHIVE_PACK_TIMEOUT_MS
    })
  }

  /** GNU tar, with owners cleared so the archive does not record the build user. */
  async function tarDirectory(parent: string, entry: string, archive: string) {
    await execute({
      command: 'tar',
      args: ['--owner=0', '--group=0', '--numeric-owner', '-czf', archive, '-C', parent, entry],
      cwd,
      output: 'inherit',
      timeoutMs: ARCHIVE_PACK_TIMEOUT_MS
    })
  }

  return { git, github, verifySignature, zipApp, extractDebian, tarDirectory }
}
