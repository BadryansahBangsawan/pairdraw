import { encode, fromUint8Array } from 'js-base64'

/** A minisign public key file, base64-encoded as Tauri's `plugins.updater.pubkey` takes it. */
export function minisignPublicKey(fill = 7): string {
  const key = fromUint8Array(
    new Uint8Array([0x45, 0x64, ...Array.from({ length: 40 }, () => fill)])
  )
  return encode(`untrusted comment: minisign public key: ${'07'.repeat(8)}\n${key}\n`)
}

/** The updater key OpenPencil's checked-in Tauri config carried. */
export const UPSTREAM_PUBLIC_KEY =
  'dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDU4QzBCRjBFNzhFNEVEMDEKUldRQjdlUjREci9BV0hLaEJPeG5tRXdsWkhQWFdEa0VxcEtNR1o1S2VJeGlKU1VDTldQTi9wYncK'
