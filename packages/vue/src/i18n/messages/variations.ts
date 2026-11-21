import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const variationMessageDefaults = {
  variations: 'Variations',
  variationsCount: params('Variations · {count}'),
  variationsOf: params('Variations of {name}'),
  previousVersion: 'Previous version',
  nextVersion: 'Next version',
  useThis: 'Use this',
  useThisHint: params('Replace {name} with this version'),
  selectVersion: 'Select a version to use it',
  goToOriginal: 'Go to original',
  discardAll: 'Discard all',
  originalChanged: 'The original changed since these were made.',
  originalMissing: 'The original is gone, so no version can replace it.',
  originalInInstance: 'The original is inside an instance, so no version can replace it.',
  originalLocked: 'The original is locked. Unlock it to use a version.',
  originalNotEditable: 'The original belongs to a library, so no version can replace it here.',
  versionTypeDiffers:
    'This version is a different kind of layer than the original, so it cannot replace it.'
} as const

export const variationMessages = i18n('variations', variationMessageDefaults)
