import { motionStyles } from '@/theme/motion/styles'

export default {
  slots: {
    body: 'flex flex-col gap-3 text-xs text-surface',
    help: 'text-xs leading-relaxed text-muted',
    // The welcome's two offers, as cards: an icon tile, then the heading and text beside it.
    intro: 'flex items-start gap-3 rounded-card border border-border bg-panel-secondary p-4',
    introIcon:
      'flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent',
    introBody: 'min-w-0 flex-1',
    introHeading: 'text-[13px] font-semibold text-surface',
    introText: 'mt-1 text-xs leading-relaxed text-muted',
    tour: 'flex items-start gap-3 rounded-card border border-border p-4',
    tourAction: 'shrink-0 self-center',
    group: 'flex flex-col gap-2',
    groupHeading: 'text-[11px] font-semibold text-muted',
    // Reads as a group heading; the gap below lives inside the animated content.
    moreTrigger: 'py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-surface',
    moreGroup: 'flex flex-col gap-2 pt-1',
    connection: 'flex flex-col gap-3 rounded-xl border border-border p-3',
    connectionHeading: 'flex items-center gap-2 text-xs font-semibold text-surface',
    signIn: 'flex flex-wrap items-center justify-between gap-2 rounded-field bg-input px-3 py-2',
    signInStatus: 'flex items-center gap-2 text-xs text-surface',
    signInActions: 'flex items-center gap-2',
    signInDetail: 'ml-1 text-muted',
    signedInIcon: 'size-3.5 shrink-0 text-success',
    spinner: `size-3.5 shrink-0 ${motionStyles.spinner}`
  }
}
