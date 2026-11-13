import { releaseVersion } from './context.ts'

export const desktopBuilds = [
  {
    target: 'aarch64-apple-darwin',
    platform: 'macos-latest',
    label: 'macos-arm64',
    saveBunCache: true
  },
  {
    target: 'x86_64-apple-darwin',
    platform: 'macos-latest',
    label: 'macos-x64',
    saveBunCache: false
  },
  {
    target: 'x86_64-pc-windows-msvc',
    platform: 'windows-latest',
    label: 'windows-x64',
    saveBunCache: true
  },
  {
    target: 'aarch64-pc-windows-msvc',
    platform: 'windows-latest',
    label: 'windows-arm64',
    saveBunCache: false
  },
  {
    target: 'x86_64-unknown-linux-gnu',
    platform: 'ubuntu-22.04',
    label: 'linux-x64',
    saveBunCache: true
  },
  {
    target: 'aarch64-unknown-linux-gnu',
    platform: 'ubuntu-22.04-arm',
    label: 'linux-arm64',
    saveBunCache: true
  }
] as const

export const desktopTargets = desktopBuilds.map((build) => build.target)

export type DesktopTarget = (typeof desktopTargets)[number]

/** Archives the release tooling packs itself, since Tauri bundles neither (`native/pack.ts`). */
export type ArchiveFormat = 'zip' | 'tar.gz'

export interface DesktopAsset {
  /** The bundle Tauri reports, or for a packed archive the bundle it is packed from. */
  source: string
  /** The published file name. */
  name: string
  updaterKeys: string[]
  signed: boolean
  pack?: ArchiveFormat
}

/** Tauri names bundles after `productName`; the published names carry the same product name. */
export const BUNDLE_NAME = 'Pairdraw'
const RELEASE_NAME = 'Pairdraw'

/** Required Pairdraw release outputs, not a discovery or packaging implementation. */
export function desktopAssets(target: DesktopTarget, version: string): DesktopAsset[] {
  releaseVersion(`v${version}`)

  if (target.endsWith('apple-darwin')) {
    const arch = target.startsWith('aarch64') ? 'aarch64' : 'x64'
    const platform = arch === 'x64' ? 'darwin-x86_64' : 'darwin-aarch64'
    return [
      {
        source: `${BUNDLE_NAME}_${version}_${arch}.dmg`,
        name: `${RELEASE_NAME}_${version}_${arch}.dmg`,
        updaterKeys: [],
        signed: false
      },
      {
        source: `${BUNDLE_NAME}.app`,
        name: `${RELEASE_NAME}_${version}_${arch}.zip`,
        updaterKeys: [],
        signed: false,
        pack: 'zip'
      },
      {
        source: `${BUNDLE_NAME}.app.tar.gz`,
        name: `${RELEASE_NAME}_${arch}.app.tar.gz`,
        updaterKeys: [platform, `${platform}-app`],
        signed: true
      }
    ]
  }
  if (target.endsWith('windows-msvc')) {
    const arch = target.startsWith('aarch64') ? 'arm64' : 'x64'
    const platform = target.startsWith('aarch64') ? 'windows-aarch64' : 'windows-x86_64'
    return [
      {
        source: `${BUNDLE_NAME}_${version}_${arch}-setup.exe`,
        name: `${RELEASE_NAME}_${version}_${arch}-setup.exe`,
        updaterKeys: [`${platform}-nsis`],
        signed: true
      },
      {
        source: `${BUNDLE_NAME}_${version}_${arch}_en-US.msi`,
        name: `${RELEASE_NAME}_${version}_${arch}_en-US.msi`,
        updaterKeys: [platform, `${platform}-msi`],
        signed: true
      }
    ]
  }
  // Each Linux format spells the architecture its own way, as Tauri's bundler does.
  const arm = target.startsWith('aarch64')
  const appImageArch = arm ? 'aarch64' : 'amd64'
  const debArch = arm ? 'arm64' : 'amd64'
  const rpmArch = arm ? 'aarch64' : 'x86_64'
  const platform = arm ? 'linux-aarch64' : 'linux-x86_64'
  const deb = `${BUNDLE_NAME}_${version}_${debArch}.deb`
  return [
    {
      source: `${BUNDLE_NAME}_${version}_${appImageArch}.AppImage`,
      name: `${RELEASE_NAME}_${version}_${appImageArch}.AppImage`,
      updaterKeys: [platform, `${platform}-appimage`],
      signed: true
    },
    {
      source: deb,
      name: `${RELEASE_NAME}_${version}_${debArch}.deb`,
      updaterKeys: [`${platform}-deb`],
      signed: true
    },
    {
      source: `${BUNDLE_NAME}-${version}-1.${rpmArch}.rpm`,
      name: `${RELEASE_NAME}-${version}-1.${rpmArch}.rpm`,
      updaterKeys: [`${platform}-rpm`],
      signed: true
    },
    // The Debian package's files, so the app runs from any folder without installing. It does
    // not update itself: the app skips update checks for a copy the package manager did not
    // install (`src/app/shell/updater/feed.ts`), as its binary would install the `.deb`.
    {
      source: deb,
      name: `${RELEASE_NAME}_${version}_${appImageArch}.tar.gz`,
      updaterKeys: [],
      signed: false,
      pack: 'tar.gz'
    }
  ]
}
