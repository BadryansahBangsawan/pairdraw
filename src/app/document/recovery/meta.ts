import type { RecoverySnapshotInput, RecoverySnapshotMeta } from '@/app/document/recovery/types'

/** What a recovery store keeps about a snapshot it writes now, beside its bytes. */
export function recoverySnapshotMeta(input: RecoverySnapshotInput): RecoverySnapshotMeta {
  const source = input.source
  return {
    id: input.id,
    documentName: input.documentName || 'Untitled',
    updatedAt: new Date().toISOString(),
    byteLength: input.figBytes.byteLength,
    formatVersion: 1,
    // A plain copy of name and path only: a live handle cannot be stored, and a reactive source
    // would not clone.
    ...(source
      ? {
          source:
            'handleName' in source
              ? source
              : { handleName: source.handle?.name ?? null, path: source.path }
        }
      : {})
  }
}
