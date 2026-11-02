import { decode, isValid } from 'js-base64'
import * as v from 'valibot'

/**
 * Minisign key lines of OpenPencil's updater keys. A Pairdraw release must never be verified
 * against them, or a Pairdraw build would accept OpenPencil releases as its own updates.
 */
const UPSTREAM_PUBLIC_KEYS = new Set([
  'RWQB7eR4Dr/AWHKhBOxnmEwlZHPXWDkEqpKMGZ5KeIxiJSUCNWPN/pbw',
  'RWTF5BK9ALhHJrNFMG9YWDECmrrqk9SlqIPXkWK34ha5FEV+PHfM/mYl'
])
const UPSTREAM_REPOSITORY = 'open-pencil/open-pencil'
/** GitHub hosts that serve release downloads; owner and repository names ignore case there. */
const GITHUB_HOSTS = new Set(['github.com', 'www.github.com'])

/** A minisign public key: the algorithm, an 8-byte key ID, and a 32-byte Ed25519 key. */
const MINISIGN_KEY_LINE = /^RW[A-Za-z0-9+/]{54}$/

const endpointSchema = v.pipe(v.string(), v.url(), v.startsWith('https://'))

export interface UpdaterFeed {
  /** Where installed apps fetch `latest.json`. */
  endpoint: string
  /** Base64 of the minisign public key file, as Tauri's `plugins.updater.pubkey` takes it. */
  pubkey: string
}

/**
 * The update feed a release build checks, from the `UPDATER_PUBLIC_KEY` and optional
 * `UPDATER_ENDPOINT` repository variables. The checked-in Tauri config names no feed, so only
 * release builds check for updates; the endpoint defaults to the latest release of the
 * repository that publishes the release, where `assemble.ts` uploads `latest.json`.
 */
export function updaterFeed(env: NodeJS.ProcessEnv, repository: string): UpdaterFeed {
  const pubkey = env.UPDATER_PUBLIC_KEY?.trim()
  if (!pubkey) {
    throw new Error('Set the UPDATER_PUBLIC_KEY repository variable to the updater public key')
  }
  if (UPSTREAM_PUBLIC_KEYS.has(minisignKeyLine(pubkey))) {
    throw new Error('UPDATER_PUBLIC_KEY is an OpenPencil updater key; generate a Pairdraw key')
  }

  const endpoint =
    env.UPDATER_ENDPOINT?.trim() ||
    `https://github.com/${repository}/releases/latest/download/latest.json`
  const parsed = v.safeParse(endpointSchema, endpoint)
  if (!parsed.success) throw new Error('UPDATER_ENDPOINT must be an https URL')
  if (isUpstreamFeed(new URL(parsed.output))) {
    throw new Error('The update feed points at OpenPencil releases')
  }

  return { endpoint: parsed.output, pubkey }
}

function isUpstreamFeed(url: URL): boolean {
  if (!GITHUB_HOSTS.has(url.hostname)) return false
  const path = url.pathname.toLowerCase()
  return path === `/${UPSTREAM_REPOSITORY}` || path.startsWith(`/${UPSTREAM_REPOSITORY}/`)
}

/** The key line of a base64-encoded minisign public key file. */
export function minisignKeyLine(pubkey: string): string {
  if (!isValid(pubkey)) throw new Error('UPDATER_PUBLIC_KEY is not base64')
  const [comment, key] = decode(pubkey).split(/\r?\n/)
  if (!comment?.startsWith('untrusted comment:') || !key || !MINISIGN_KEY_LINE.test(key)) {
    throw new Error('UPDATER_PUBLIC_KEY is not a minisign public key')
  }
  return key
}
