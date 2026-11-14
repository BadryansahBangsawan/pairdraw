/**
 * The chat's message box, here and on Home: a card on the panel holding the field, the images
 * and files attached to it, and a toolbar whose send button carries the accent.
 */
export default {
  slots: {
    root: 'shrink-0 px-3 pt-1 pb-3',
    /** Over the input group's own border, radius, and focus ring. */
    group: 'bg-panel elevation-card',
    /** The first prompt's field and the bar holding its send button, stacked unless inline. */
    control: '',
    toolbar: '',
    /** A first prompt's text field, which grows with what is written up to its maximum. */
    field:
      'block max-h-60 min-h-16 w-full resize-none bg-transparent px-3 pt-2.5 text-sm leading-relaxed text-surface outline-none field-sizing-content placeholder:text-muted',
    send: 'rounded-lg bg-accent text-on-accent hover:bg-accent/90 hover:text-on-accent',
    sendIcon: 'size-3.5',
    stop: 'rounded-lg border border-border',
    stopIcon: 'size-3',
    attachments: 'flex flex-wrap gap-1.5',
    image:
      'flex max-w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-panel-field p-1.5',
    imageThumb: 'size-10 shrink-0 rounded-md border border-border object-cover',
    imageName: 'min-w-0 flex-1 truncate text-[10px] text-surface',
    /** A text file attached to the message, beside the images. */
    file: 'flex max-w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-panel-field p-1.5',
    fileIcon:
      'flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-panel text-muted',
    fileName: 'min-w-0 flex-1 truncate text-[10px] text-surface'
  },
  variants: {
    /** A first prompt on one line, such as the canvas's: the field with its send button beside it. */
    inline: {
      true: {
        group: 'flex items-end rounded-2xl',
        control: 'flex-1',
        toolbar: 'h-auto py-1.5',
        field: 'max-h-40 min-h-0 py-2.5'
      }
    }
  }
} as const
