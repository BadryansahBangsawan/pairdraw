/**
 * What an embedded editor shows over its canvas until the host page connects: the window backdrop
 * with one centered message, its icon tinted by whether the embed is waiting or refused.
 */
export default {
  slots: {
    root: 'fixed inset-0 z-30 flex bg-canvas text-surface',
    icon: ''
  },
  variants: {
    status: {
      waiting: { icon: 'text-muted' },
      'invalid-origin': { icon: 'bg-warning-bg text-warning' }
    }
  },
  defaultVariants: { status: 'waiting' as const }
} as const
