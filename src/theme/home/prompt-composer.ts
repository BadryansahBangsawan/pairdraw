import { motionStyles } from '@/theme/motion/styles'

/** Home's first ask: a large heading over a wide composer, the first thing on the page. */
export default {
  slots: {
    root: 'relative mx-auto mb-8 w-full max-w-2xl pt-3 @2xl/home:mb-10 @2xl/home:pt-10',
    heading:
      'mb-4 text-center text-xl font-semibold tracking-tight text-balance text-surface @2xl/home:mb-5 @2xl/home:text-2xl',
    /** Taller than the chat's field at rest, as the page's main ask. */
    field: 'min-h-24',
    /** Example prompts under the field, which fill it when picked. */
    examples: 'mt-3',
    /**
     * What the prompt waits for while it starts, such as the lookup for a coding agent; it sits
     * in the space below the composer, so nothing moves when it shows.
     */
    status:
      'absolute inset-x-0 top-full mt-2 flex items-center justify-center gap-1.5 text-xs text-muted',
    spinner: `size-3.5 shrink-0 ${motionStyles.spinner}`
  }
} as const
