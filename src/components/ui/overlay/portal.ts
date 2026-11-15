import { inject, provide, type InjectionKey } from 'vue'

const portalledKey: InjectionKey<boolean> = Symbol('overlay-portalled')

/** Tells the dialog below that its place in the page is already given, so it renders where it is. */
export function provideOverlayPortalled(): void {
  provide(portalledKey, true)
}

/**
 * Whether this dialog sits in a place `LazyOverlay` already gave it. Only the nearest dialog takes
 * that place: dialogs it opens portal as usual.
 */
export function useOverlayPortalled(): boolean {
  const portalled = inject(portalledKey, false)
  if (portalled) provide(portalledKey, false)
  return portalled
}
