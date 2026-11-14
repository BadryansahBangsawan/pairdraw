/**
 * The prompt the canvas carries at its bottom centre: one line that goes to the AI chat, with
 * what to ask for under it while the page is empty. Only its own controls take the pointer, so the
 * canvas around them still draws.
 */
export default {
  slots: {
    root: 'pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-16',
    card: 'pointer-events-auto flex w-full max-w-xl animate-in items-center gap-1 fade-in motion-reduce:animate-none',
    composer: 'min-w-0 flex-1',
    examples: 'pointer-events-auto'
  }
} as const
