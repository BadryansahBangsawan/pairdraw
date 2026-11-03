import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const slidesMessageDefaults = {
  title: 'Slides',
  listLabel: 'Slides on this page',
  slideLabel: params('Slide {number}: {name}'),
  reorderHint: 'Drag to reorder, or press Alt with the up or down arrow.',
  slideMoved: params('{name} moved to slide {number}.'),
  present: params('Present ({shortcut})'),
  presentFromSlide: 'Present from this slide',
  exportPDF: 'Export slides to PDF',
  exportPPTX: 'Export slides to PowerPoint',
  exportPPTXFailed: params('Could not export the slides: {error}'),
  emptyTitle: 'No slides yet',
  emptyDescription: 'Top-level frames on this page become slides, in layer order.',
  nothingToPresent: 'Add a top-level frame to this page to present it.',
  presentation: 'Presentation',
  previousSlide: 'Previous slide',
  nextSlide: 'Next slide',
  position: params('{number} of {count}'),
  fitToScreen: 'Fit to screen',
  actualSize: 'Actual size',
  exitPresentation: params('Exit presentation ({shortcut})')
} as const

export const slidesMessages = i18n('slides', slidesMessageDefaults)
