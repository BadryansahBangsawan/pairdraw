import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Marks each landing frame drawn once, the first time it is seen, so its copy animates in and
 * then stays whole: scrolling back up never clips a heading or a paragraph again.
 */
export function useDrawOnce(): void {
  if (typeof document !== 'undefined') document.documentElement.classList.add('lp-draw-ready')
  let drawing: IntersectionObserver | undefined

  onMounted(() => {
    const frames = [...document.querySelectorAll<HTMLElement>('.landing-home [data-draw]')]
    if (!('IntersectionObserver' in window)) {
      for (const frame of frames) frame.dataset.drawn = ''
      return
    }
    drawing = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          ;(entry.target as HTMLElement).dataset.drawn = ''
          drawing?.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    )
    for (const frame of frames) drawing.observe(frame)
  })

  onBeforeUnmount(() => drawing?.disconnect())
}
