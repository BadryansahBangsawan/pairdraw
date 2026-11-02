import { floatingSurface } from '@/theme/overlay'

export default {
  slots: {
    root: [
      'fixed right-4 bottom-4 z-50 w-80 max-w-[calc(100vw-2rem)] p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2',
      floatingSurface
    ]
  }
}
