import { hudSurface } from '@/theme/mobile/hud-button'

/** The mobile HUD's indicators: the armed tool, and the toast an action leaves. */
export default {
  slots: {
    toolBadge: [
      'flex size-8 items-center justify-center rounded-full transition-colors duration-200',
      hudSurface
    ],
    toolIcon: 'size-3.5 text-primary',
    // Ink-filled, as every toast is.
    toast:
      'flex h-8 items-center rounded-full bg-surface px-3 text-xs whitespace-nowrap text-panel elevation-floating'
  }
} as const
