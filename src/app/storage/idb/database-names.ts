/** Stable names for the app's independent IndexedDB databases. */
export const APP_DATABASE_NAMES = {
  chats: 'pairdraw-chats',
  credentials: 'pairdraw-credentials',
  libraries: 'pairdraw-libraries',
  localCanvas: 'pairdraw-cloud-local',
  outbox: 'pairdraw-cloud-outbox',
  recovery: 'pairdraw-recovery',
  diagnostics: 'pairdraw-diagnostics',
  skills: 'pairdraw-skills',
  /** Written and deleted once per page, to learn whether the engine stores Blobs. */
  blobProbe: 'pairdraw-blob-probe'
} as const
