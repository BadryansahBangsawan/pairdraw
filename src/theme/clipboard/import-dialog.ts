import type { DialogUI } from '@/components/ui/dialog/ui'

/**
 * Asking how layers pasted from another document bring their variables and styles: a list of
 * the ones this document already has, each with a Use existing / Add renamed choice.
 */
export default {
  slots: {
    conflicts: 'flex flex-col gap-1.5',
    title: 'text-xs font-medium text-surface',
    hint: 'text-[11px] leading-relaxed text-muted',
    list: 'mt-1 max-h-64 overflow-y-auto rounded-lg border border-border',
    row: 'flex items-center gap-2.5 border-b border-border px-3 py-2 last:border-b-0',
    icon: 'size-3.5 shrink-0 text-muted',
    label: 'flex min-w-0 flex-1 flex-col',
    name: 'truncate text-xs text-surface',
    meta: 'truncate text-[11px] text-muted',
    choice: 'shrink-0',
    cancel: 'mr-auto'
  }
} as const

/** With nothing to choose between, the question reads as one card, as Save before closing does. */
export const clipboardImportQuestionUI = {
  header: 'border-b-0 px-5 pt-5 pb-4',
  title: 'mb-1 break-words',
  description: 'leading-relaxed',
  body: 'px-5 pt-0 pb-4',
  footer: 'border-t-0 px-5 pt-0 pb-5'
} satisfies DialogUI
