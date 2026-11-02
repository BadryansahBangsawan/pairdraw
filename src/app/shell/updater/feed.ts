import type { Update } from '@tauri-apps/plugin-updater'

/**
 * `tauri-plugin-updater` fails a check with `Error::EmptyEndpoints`, before any request, when
 * the build names no update feed. The checked-in `desktop/tauri.conf.json` names none; only a
 * release build gets one, from `tools/release/release-packages/src/native/updater.ts`, so local
 * and fork builds never offer another product's releases.
 */
const MISSING_FEED_ERROR = 'does not have any endpoints set'

/** Why a copy unpacked from the Linux `.tar.gz` makes no update check. */
const UNPACKAGED_COPY_ERROR = 'Updates install through the system package, which this copy is not'

/** Bundle types whose updates `tauri-plugin-updater` installs with `dpkg` or `rpm`. */
const SYSTEM_PACKAGE_BUNDLES: ReadonlySet<string> = new Set(['deb', 'rpm'])

/**
 * Where Tauri resolves an installed Linux package's resources; a copy run from another folder
 * resolves them beside its own `usr/bin`, because `native/pack.ts` packs `usr/lib/<product>`.
 */
const SYSTEM_RESOURCE_ROOT = '/usr/lib/'

/** Whether an updater error means this build or copy has no update feed, not a failed check. */
export function isMissingUpdateFeed(error: string): boolean {
  return error.includes(MISSING_FEED_ERROR) || error.includes(UNPACKAGED_COPY_ERROR)
}

/**
 * Checks the update feed. A copy of a Linux system package that the package manager did not
 * install, such as the portable `.tar.gz`, fails like a build without a feed: its binary is the
 * `.deb`'s, so the updater would install the `.deb` system-wide and leave this copy behind.
 */
export async function checkUpdateFeed(): Promise<Update | null> {
  const { getBundleType } = await import('@tauri-apps/api/app')
  const bundleType: string | null = await getBundleType()
  if (bundleType && SYSTEM_PACKAGE_BUNDLES.has(bundleType)) {
    const { resourceDir } = await import('@tauri-apps/api/path')
    if (!(await resourceDir()).startsWith(SYSTEM_RESOURCE_ROOT)) {
      throw new Error(UNPACKAGED_COPY_ERROR)
    }
  }
  const { check } = await import('@tauri-apps/plugin-updater')
  return check()
}
