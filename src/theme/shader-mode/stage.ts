/**
 * Shader Mode's stage: the shader large in a card of its own, framed with its layer's
 * proportions over the canvas backdrop, its transport under it, and its settings in a card
 * beside it, or below it where the stage is narrow (`@container/shader-mode`).
 */
const shaderModeStageTheme = {
  slots: {
    root: '@container/shader-mode flex min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas p-2.5 outline-none',
    layout: 'flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 @3xl/shader-mode:flex-row',
    main: 'flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-panel elevation-card',
    header: 'flex h-11 shrink-0 items-center gap-2 border-b border-border ps-3.5 pe-2',
    heading: 'flex min-w-0 items-baseline gap-2',
    title: 'shrink-0 text-xs font-medium text-surface',
    name: 'min-w-0 truncate text-xs text-muted',
    actions: 'ms-auto flex shrink-0 items-center gap-1',
    area: 'relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-canvas p-6',
    frame: 'relative shrink-0 overflow-hidden rounded-field ring-1 ring-border',
    canvas: 'absolute inset-0 size-full',
    still: 'absolute inset-0 size-full object-cover',
    status:
      'pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted',
    notice: 'px-3.5 pt-3',
    footer: 'shrink-0 border-t border-border px-3.5 py-2.5',
    settings:
      'scrollbar-thin flex h-64 shrink-0 flex-col gap-3 overflow-y-auto rounded-card border border-border bg-panel px-3.5 py-3 elevation-card @3xl/shader-mode:h-auto @3xl/shader-mode:w-72',
    settingsTitle: 'text-xs font-medium text-surface'
  }
} as const

export default shaderModeStageTheme
