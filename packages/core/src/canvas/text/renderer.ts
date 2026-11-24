import type { CanvasKit, TypefaceFontProvider } from 'canvaskit-wasm'

import type { ColorProfile, SceneNode } from '@pairdraw/scene-graph'

import type { FontResolutionSettled } from '#core/text/resolver'

import type { TextPreparationCache } from './preparation/cache'

export interface FontReadinessRenderer {
  textPreparationCache?: TextPreparationCache
  ck?: CanvasKit
  fontProvider?: TypefaceFontProvider | null
  fontsLoaded?: boolean
  /** The renderer has finished preparing its fonts, so a face still pending will not arrive. */
  exportFontsSettled?: boolean
  onFontResolutionSettled?: FontResolutionSettled
  trackFontDemand?: (node: SceneNode, key: string) => void
}

export interface TextRenderer extends FontReadinessRenderer {
  ck: CanvasKit
  documentColorSpace?: ColorProfile
  fontProvider: TypefaceFontProvider | null
  fontsLoaded: boolean
}
