/**
 * A failed save, across the top of the canvas until the next successful save. Only the alert
 * takes the pointer, so the canvas around it still draws.
 */
export default {
  slots: {
    root: 'pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3',
    alert: 'pointer-events-auto w-full max-w-lg elevation-floating'
  }
} as const
