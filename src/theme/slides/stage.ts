/**
 * The presentation's stage: the canvas over the whole window on black, with the parts around
 * the slide blacked out above the canvas and its live controls.
 */
const slidesStageTheme = {
  slots: {
    root: 'fixed inset-0 z-50 flex overflow-hidden bg-black outline-none',
    canvas: 'relative flex min-w-0 flex-1',
    letterbox: 'absolute z-20 bg-black',
    status: 'sr-only'
  }
} as const

export default slidesStageTheme
