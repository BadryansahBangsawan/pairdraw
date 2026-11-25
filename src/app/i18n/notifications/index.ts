import { createI18n, params } from '@nanostores/i18n'
import type { ComponentsJSON } from '@nanostores/i18n'
import { useStore } from '@nanostores/vue'

import { locale, type Locale, type TranslatedLocale } from '@pairdraw/vue/i18n'

const notificationMessageDefaults = {
  linkCopied: 'Link copied to clipboard.',
  clipboardMissingDesignData: 'Clipboard does not contain design data.',
  clipboardAccessBlocked: 'Clipboard access is blocked in this browser context.',
  copiedAs: params('Copied as {format}.'),
  copiedProperties: 'Copied properties.',
  tokensLeftOut: params('Left out of the stylesheet: {names}.'),
  designTokensLeftOut: params('Left out of the design tokens: {names}.'),
  designTokensAmbiguous: params(
    'These styles refer to a variable whose path another collection also has, so other tools may read the wrong one: {names}.'
  ),
  designTokensImported: params('Imported {count} design tokens.'),
  designTokensNeedReview: params(
    '{count} tokens changed on the canvas or in both places. Review them in Variables.'
  ),
  unsupportedVariableExpressions: params(
    'Pairdraw can’t evaluate these variables yet, so layers keep the values saved in the file: {names}.'
  ),
  nodeID: 'node ID',
  nodeIDs: 'node IDs',
  xPath: 'XPath',
  xPaths: 'XPaths',
  pngClipboardUnavailable: 'PNG clipboard export is not available in this browser.',
  openFileFailed: params('Could not open “{name}”: {error}'),
  saveFailed: params('Couldn’t save “{name}”. {error}'),
  importedLibrariesNeedDesktop: params(
    'The browser can’t open the libraries “{name}” imports ({paths}), so their components show as placeholders. Open the file in the desktop app to see them.'
  ),
  importedLibrariesNeedOpenDialog: params(
    'A dropped file can’t open the libraries “{name}” imports ({paths}), so their components show as placeholders. Open it with File > Open… to see them.'
  ),
  importedLibrariesUnreadable: params(
    'Couldn’t open the libraries “{name}” imports ({paths}), so their components show as placeholders.'
  ),
  unknownVariables: params(
    'Layers reference variables the document does not define ({names}); they use their fallback values.'
  ),
  missingImages: params(
    'Image files the document names are missing ({names}); their fills are left out.'
  ),
  unknownNodeTypes: params(
    'Layers use node types Pairdraw does not know ({names}); they show as placeholders.'
  ),
  viewDiagnostics: 'View diagnostics',
  importedDOMCSS: 'Imported DOM/CSS document.',
  importDOMCSSFailed: params('Could not import DOM/CSS: {error}'),
  openDOMCSSFailed: params('Could not open DOM/CSS file: {error}'),
  vectorizeCredentialRequired: params('Add a {provider} API key in Settings → Image services.'),
  vectorizeImageMissing: 'Image data is missing for this layer.',
  vectorizingImage: 'Vectorizing image…',
  imageConvertedToVectors: 'Vectors added beside the image.',
  vectorizeCredentialFailed: params('{error}. Update it in Settings → Image services.'),
  vectorizeFailed: params('{provider} could not vectorize this image: {error}'),
  imageAIRemovingBackground: 'Removing background…',
  imageAIReplacingBackground: 'Replacing background…',
  imageAIGeneratingImage: 'Generating image…',
  imageAIGeneratingSVG: 'Generating SVG…',
  imageAICredentialRequired: params('Add a {service} API key in Settings → Image services.'),
  imageAIBaseURLRequired: params('Add the {service} address in Settings → Image services.'),
  imageAICredentialRejected: params(
    '{service} rejected the saved API key. Update it in Settings → Image services.'
  ),
  imageAIFailed: params('{service} could not finish: {error}'),
  imageAITargetChanged: 'The layer changed before the result arrived, so it was left as it is.',
  imageAIPlaceFailed: 'The result arrived but could not be placed on the canvas.',
  imageAIBackgroundRemoved: 'Background removed.',
  imageAIBackgroundReplaced: 'Background replaced.',
  imageAIImageGenerated: 'Image generated.',
  imageAISVGGenerated: 'SVG generated.',
  imageAIBusy: 'An image request is still running.',
  operationFailed: params('Operation failed: {error}'),
  storageConnected: 'Connected. Storage namespace is ready.',
  deepLinkLocateFile: params('Locate “{file}” to follow this link.'),
  deepLinkPickerDismissed: 'Link cancelled: no file was chosen.',
  deepLinkCancelled: params('Link cancelled: expected a file ending in “{file}”.'),
  deepLinkNodeNotFound: params('Node “{node}” was not found in “{file}”.'),
  openQueuedFilesFailed: params('Could not open the files handed to Pairdraw: {error}'),
  placeImageUnsupported: 'Choose a PNG, JPEG, WebP, GIF, AVIF, or SVG file to place.',
  placeImageFailed: params('Could not place the files: {error}'),
  exportPDFEmpty: 'This page has no frames to export.',
  exportPDFFailed: params('Could not export the PDF: {error}'),
  penMergedPages: params(
    'Pencil.dev files hold one page; {pages} pages were merged into “{name}”.'
  ),
  penColorsToSRGB:
    'Colours are written as sRGB hex, the only form a Pencil.dev file holds; a Display P3 colour outside sRGB is written as the nearest sRGB colour.',
  penMissingImageFillsOne:
    'An image fill was left out because its image data is missing; Pencil.dev files cannot hold a paint without its image.',
  penMissingImageFillsMany: params(
    '{count} image fills were left out because their image data is missing; Pencil.dev files cannot hold a paint without its image.'
  ),
  penDroppedEffectsOne:
    'A noise or texture effect was left out; Pencil.dev files have no form for it.',
  penDroppedEffectsMany: params(
    '{count} noise and texture effects were left out; Pencil.dev files have no form for them.'
  ),
  penDroppedFiltersOne:
    'An image adjustment filter was left out; Pencil.dev files have no form for it.',
  penDroppedFiltersMany: params(
    '{count} image adjustment filters were left out; Pencil.dev files have no form for them.'
  ),
  penDroppedScrollOne:
    'A layer’s scroll overflow was left out; Pencil.dev files have no form for it.',
  penDroppedScrollMany: params(
    'Scroll overflow was left out on {count} layers; Pencil.dev files have no form for it.'
  ),
  penDroppedFontFeaturesOne:
    'A layer’s OpenType font features were left out; Pencil.dev files have no form for them.',
  penDroppedFontFeaturesMany: params(
    'OpenType font features were left out on {count} layers; Pencil.dev files have no form for them.'
  ),
  penLibraryDefinitionsOne:
    'Library components came from one enabled library, whose definitions Pencil.dev files do not hold; re-enable that library after reopening to restore them.',
  penLibraryDefinitionsMany: params(
    'Library components came from {count} enabled libraries, whose definitions Pencil.dev files do not hold; re-enable those libraries after reopening to restore them.'
  ),
  drawioUnboundVariablesNoLayers: params(
    'draw.io has no variables: {variables} in {collections} ({names}) not written.'
  ),
  drawioUnboundVariablesOneLayer: params(
    'draw.io has no variables: {variables} in {collections} ({names}) not written, and the layer that uses them lost its binding.'
  ),
  drawioUnboundVariablesManyLayers: params(
    'draw.io has no variables: {variables} in {collections} ({names}) not written, and {layers} layers that use them lost their bindings.'
  ),
  oneVariable: '1 variable',
  manyVariables: params('{count} variables'),
  oneCollection: '1 collection',
  manyCollections: params('{count} collections'),
  writeWarningsMore: params('and {count} more could not be saved.')
} as const

export { notificationMessageDefaults }

const localeLoaders = {
  de: () => import('./locales/de.json'),
  es: () => import('./locales/es.json'),
  fr: () => import('./locales/fr.json'),
  id: () => import('./locales/id.json'),
  it: () => import('./locales/it.json'),
  ja: () => import('./locales/ja.json'),
  pl: () => import('./locales/pl.json'),
  ru: () => import('./locales/ru.json'),
  'zh-CN': () => import('./locales/zh-cn.json')
} satisfies Record<TranslatedLocale, () => Promise<{ default: Record<string, string> }>>

const appI18n = createI18n<Locale, 'en'>(locale, {
  baseLocale: 'en',
  async get(code): Promise<ComponentsJSON> {
    if (code === 'en') return {}
    const loaded = await localeLoaders[code]()
    return { notifications: loaded.default }
  }
})

export const notificationMessages = appI18n('notifications', notificationMessageDefaults)

export function useNotificationMessages() {
  return useStore(notificationMessages)
}
