/**
 * A Settings page's building blocks: a section with its heading, description, and actions, rows
 * grouped in a bordered card, and each row's text beside its control.
 */
export default {
  slots: {
    section: 'flex flex-col gap-3',
    header: 'flex items-start justify-between gap-4',
    heading: 'min-w-0 flex-1',
    title: 'text-[13px] font-semibold text-surface',
    description: 'mt-1 text-xs leading-relaxed text-muted',
    actions: 'shrink-0',
    group: 'flex flex-col divide-y divide-border rounded-xl border border-border bg-panel',
    row: 'flex items-center justify-between gap-4 px-3 py-2.5',
    rowText: 'block min-w-0 flex-1',
    rowLabel: 'block text-xs font-medium text-surface',
    rowDescription: 'mt-1 block text-[11px] leading-relaxed text-muted',
    rowControl: 'flex shrink-0 items-center gap-1'
  }
} as const
