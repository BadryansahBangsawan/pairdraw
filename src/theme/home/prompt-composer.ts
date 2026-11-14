import { motionStyles } from '@/theme/motion/styles'

/** Home's first ask: a large heading over a wide composer, the first thing on the page. */
export default {
  slots: {
    root: 'relative mx-auto mb-8 w-full max-w-2xl pt-3 @2xl/home:pt-10',
    /** Names the section for assistive technology; the chips and the field say the rest. */
    heading: 'sr-only',
    /** Taller than the chat's field at rest, as the page's main ask. */
    field: 'min-h-24',
    /**
     * What the prompt waits for while it starts, such as the lookup for a coding agent; it sits
     * in the space below the composer, so nothing moves when it shows.
     */
    status:
      'absolute inset-x-0 top-full mt-2 flex items-center justify-center gap-1.5 text-xs text-muted',
    spinner: `size-3.5 shrink-0 ${motionStyles.spinner}`
  }
} as const
