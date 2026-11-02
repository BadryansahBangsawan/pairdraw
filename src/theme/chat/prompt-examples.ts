/**
 * Example prompts under a first prompt, on Home and over an empty page: a row of pills that wraps,
 * quieter than the composer above them.
 */
const promptExamplesTheme = {
  slots: {
    root: 'flex flex-wrap items-center justify-center gap-1.5',
    item: 'flex',
    icon: 'size-3.5 shrink-0'
  }
} as const

export type PromptExamplesTheme = typeof promptExamplesTheme
export default promptExamplesTheme
