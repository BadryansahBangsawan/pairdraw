import { count, params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const fontsMessageDefaults = {
  settingsTitle: 'Font settings',
  issueFound: '1 font face is unavailable or substituted',
  issuesFound: params('{count} font faces are unavailable or substituted'),
  selectAffectedLayers: 'Select layers',
  retry: 'Retry fonts',
  retrying: 'Retrying…',
  expandIssues: 'Show font issues',
  collapseIssues: 'Hide font issues',
  noSubstitute: 'no substitute available',
  replaceFonts: 'Replace fonts',
  replaceFontsDescription:
    'Swap the fonts this document uses. Missing fonts are selected; every text layer, character run, and text style follows.',
  missingFont: 'Missing',
  usedByOneLayer: '1 layer',
  usedByLayers: params('{count} layers'),
  replaceWith: 'Replace with',
  fontStyle: 'Font style',
  replaceSelected: 'Replace selected',
  nothingToReplace: 'This document uses no fonts yet.',
  chooseReplacement: 'Choose a different font for at least one row.',
  unsupportedFormatShort: 'unsupported format',
  unsupportedFormat: 'Installed, but in a format Pairdraw can’t draw yet',
  affectedLayer: '1 affected layer',
  affectedLayerCount: params('{count} affected layers'),
  settingsDesktopDescription:
    'Access system fonts, online providers, fallback packs, and cached downloads.',
  settingsBrowserDescription:
    'Allow browser access to local fonts and manage online font providers.',
  localFonts: 'Local fonts',
  onlineFonts: 'Online fonts',
  downloadedCache: 'Downloaded cache',
  cachedFontCount: count({ one: '{count} font', many: '{count} fonts' }),
  systemFontAccess: 'System font access',
  systemFontsAvailable: 'System fonts are available.',
  allowBrowserFontAccess: 'Allow browser font access when system fonts are missing.',
  onlineFontProviders: 'Online font providers',
  downloadMissingWebFonts: 'Download missing web fonts through enabled providers.',
  fallbackPacks: 'Fallback packs',
  downloadFallbackPacksDescription:
    'Download CJK and Arabic fallbacks before opening files that need them.',
  localFontAccessEnabled: 'Local font access enabled.',
  localFontAccessNotGranted: 'Local font access was not granted.',
  onlineFontProvidersEnabled: 'Online font providers enabled.',
  onlineFontProvidersDisabled: 'Online font providers disabled.',
  providerEnabled: params('Enabled {provider}.'),
  providerDisabled: params('Disabled {provider}.'),
  fallbackDownloaded: 'Fallback fonts downloaded.',
  fallbackDownloadFailed: 'Could not download fallback fonts.',
  downloadedFontCacheCleared: 'Downloaded font cache cleared.',
  downloadedFontCacheClearFailed: 'Could not clear downloaded font cache.',
  clearCache: 'Clear cache'
} as const

export const fontsMessages = i18n('fonts', fontsMessageDefaults)
