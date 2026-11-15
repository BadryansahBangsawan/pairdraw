function importMarkdownContent() {
  return import('@/components/markdown/MarkdownContent.vue')
}

let loading: ReturnType<typeof importMarkdownContent> | undefined

/**
 * Loads the Markdown renderer, its parser, and Shiki with the first Markdown shown rather than
 * with the screen that may show some. Once loaded, the same settled promise is handed out, so
 * Markdown drawn later renders in the same frame instead of after another module lookup.
 */
export function loadMarkdownContent(): ReturnType<typeof importMarkdownContent> {
  loading ??= importMarkdownContent().catch((error: unknown) => {
    // A failed load, such as a dropped connection, is tried again by the next Markdown shown.
    loading = undefined
    throw error
  })
  return loading
}
