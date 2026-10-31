import { motionStyles } from '@/theme/motion/styles'

/** Setup of a coding agent or Pi and the OpenPencil companions it needs on this computer. */
export default {
  slots: {
    help: 'text-xs leading-relaxed text-muted',
    status: 'flex items-center gap-2 text-xs text-surface',
    spinner: `size-3.5 shrink-0 ${motionStyles.spinner}`,
    list: 'flex flex-col gap-1.5',
    item: 'flex items-center gap-2 text-xs text-surface',
    readyIcon: 'size-3.5 shrink-0 text-success',
    missingIcon: 'size-3.5 shrink-0 text-muted',
    failedIcon: 'size-3.5 shrink-0 text-error',
    /** The account or detail a finished step found, after its label. */
    detail: 'text-muted',
    actions: 'flex items-center gap-2',
    signIn: 'flex flex-col items-start gap-2',
    code: 'flex w-full items-center gap-2'
  }
}
