import { count, params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const recoveryMessageDefaults = {
  dialogTitle: 'Recover unsaved work',
  dialogDescription: 'Pairdraw found documents from a previous session.',
  restoreFailed: 'Could not restore this document.',
  settingsTitle: 'Recovery',
  settingsDescription: 'Control local crash-recovery copies for unsaved documents.',
  preserveUnsavedWork: 'Automatically preserve unsaved work',
  preserveUnsavedWorkDescription:
    'Store local recovery copies so documents can be restored after an unexpected shutdown.',
  restore: 'Restore',
  discard: 'Discard',
  drafts: 'Drafts',
  draftsDescription: 'New designs stay here on this device until you save them somewhere.',
  loadingDrafts: 'Loading drafts',
  noDrafts: 'No drafts yet',
  noDraftsDescription: 'A new design is kept here as a draft while you work on it.',
  draftsOff: 'Drafts are off',
  draftsOffDescription:
    'New designs are kept here only while “Automatically preserve unsaved work” is on in Settings and this browser keeps site data.',
  deleteDraft: 'Delete draft',
  deleteDraftConfirmation: params('Delete the draft “{name}”?'),
  deleteDraftsConfirmation: count({
    one: 'Delete {count} draft?',
    many: 'Delete {count} drafts?'
  }),
  deleteDraftDescription: 'Drafts are kept only on this device. This can’t be undone.',
  deleteDraftFailed: params('Couldn’t delete the draft “{name}”. Try again.'),
  draftUnavailable: 'This draft is no longer available.',
  recoveredChangesTitle: 'Recovered changes',
  recoveredChangesDescription: params(
    '“{name}” has changes from {time} that were never saved to the file. Save them to the file, save them as a new file, or discard them.'
  ),
  saveRecovered: 'Save',
  saveRecoveredAs: 'Save As…',
  discardRecovered: 'Don’t Save',
  recoveredChangesFailed: params('Couldn’t save the recovered changes: {error}'),
  backupUnavailable: 'The backup of these changes is no longer available.'
} as const

export const recoveryMessages = i18n('recovery', recoveryMessageDefaults)
