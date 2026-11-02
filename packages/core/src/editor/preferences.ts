export interface SnappingPreferences {
  geometry: boolean
  objects: boolean
  pixelGrid: boolean
  /**
   * Whether Snap to pixel grid also lands on half pixels in a design, so a 1 px stroke can sit
   * centred on a pixel edge. Absent means off.
   */
  halfPixel?: boolean
}

export const DEFAULT_SNAPPING_PREFERENCES: Readonly<SnappingPreferences> = {
  geometry: true,
  objects: true,
  pixelGrid: true,
  halfPixel: false
}
