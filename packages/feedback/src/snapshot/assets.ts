/**
 * What a release file is, from the names our release workflow gives them. Installers on
 * Windows and Linux double as their update packages; on macOS updates are their own archive, and
 * every running desktop app fetches `latest.json` when it checks for an update. The macOS `.zip`
 * of the app and the Linux `.tar.gz` that runs from any folder are downloads people install from,
 * so they count as installers (`tools/release/release-packages/src/native/catalog.ts`).
 * Signatures, checksums, and manifests are not counted.
 */
export type ReleaseFileKind =
  | 'macos-installer'
  | 'macos-update'
  | 'windows-installer'
  | 'linux-installer'
  | 'update-check'

/** Checked in order, so the macOS update's `.app.tar.gz` is never taken for a Linux archive. */
const KINDS: [suffix: string, kind: ReleaseFileKind][] = [
  ['.app.tar.gz', 'macos-update'],
  ['.dmg', 'macos-installer'],
  ['.zip', 'macos-installer'],
  ['.exe', 'windows-installer'],
  ['.msi', 'windows-installer'],
  ['.deb', 'linux-installer'],
  ['.rpm', 'linux-installer'],
  ['.AppImage', 'linux-installer'],
  ['.tar.gz', 'linux-installer']
]

export function releaseFileKind(name: string): ReleaseFileKind | undefined {
  if (name === 'latest.json') return 'update-check'
  return KINDS.find(([suffix]) => name.endsWith(suffix))?.[1]
}
