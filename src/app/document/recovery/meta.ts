import type { RecoverySnapshotInput, RecoverySnapshotMeta } from '@/app/document/recovery/types'

/** What a recovery store keeps about a snapshot it writes now, beside its bytes. */
export function recoverySnapshotMeta(input: RecoverySnapshotInput): RecoverySnapshotMeta {
  return {
    id: input.id,
    documentName: input.documentName || 'Untitled',
    updatedAt: new Date().toISOString(),
    byteLength: input.figBytes.byteLength,
    formatVersion: 1,
    // A plain copy: storage clones it, and a reactive source would not clone.
    ...(input.source ? { source: { handle: input.source.handle, path: input.source.path } } : {})
  }
}
