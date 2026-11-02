import { i18n } from '#vue/i18n/create'

export const renderingMessageDefaults = {
  settingsTitle: 'Rendering',
  settingsDescription: 'Choose how Pairdraw presents large canvases.',
  progressiveTiled: 'Progressive rendering',
  progressiveTiledDescription: 'Updates large canvases in smaller tiles as you navigate.',
  progressiveTiledByUltralight: 'Always on while Ultralight mode is on.',
  experimental: 'Experimental',
  ultralight: 'Ultralight mode',
  ultralightDescription:
    'Saves power and memory on slower computers: turns off animations, renders in tiles at standard resolution, and simplifies blurs, noise, and shadows.',
  reloadRequired: 'Reload Pairdraw to apply this change.',
  wideGamutUnavailable:
    'This display or browser cannot show Display-P3 colors, so the canvas previews them in sRGB. The document keeps its color space.',
  urlOverride:
    'The current session renderer is controlled by a URL override. Your saved preference applies when the override is removed.'
} as const

export const renderingMessages = i18n('rendering', renderingMessageDefaults)
