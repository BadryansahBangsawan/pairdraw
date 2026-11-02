/**
 * The zoom level in the top bar, which opens the zoom and view options. It sits on the backdrop,
 * so it is a bordered panel-coloured pill rather than a field.
 */
export default {
  slots: {
    trigger:
      'flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border bg-panel ps-2.5 pe-1.5 text-xs font-medium text-surface tabular-nums transition-colors outline-none hover:bg-panel-field-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=open]:bg-panel-field-hover',
    chevron: 'size-3 shrink-0 text-muted',
    input:
      'w-full rounded-field border border-accent bg-input px-2 py-1 text-xs text-surface outline-none',
    inputTrigger:
      'w-full cursor-pointer rounded-field border border-border bg-input px-2 py-1 text-left text-xs text-surface hover:border-muted'
  }
}
