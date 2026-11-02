/** Home's first ask: a large heading over a wide composer, the first thing on the page. */
export default {
  slots: {
    root: 'mx-auto mb-8 w-full max-w-2xl pt-3 @2xl/home:mb-10 @2xl/home:pt-10',
    heading:
      'mb-4 text-center text-xl font-semibold tracking-tight text-balance text-surface @2xl/home:mb-5 @2xl/home:text-2xl',
    /** Taller than the chat's field at rest, as the page's main ask. */
    field: 'min-h-24'
  }
} as const
