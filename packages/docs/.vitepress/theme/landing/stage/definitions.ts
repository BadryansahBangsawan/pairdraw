import { defineAsyncComponent, type Component } from 'vue'

import type { StageKind } from '../posters'
import { SCENES, type SceneBuilder } from './scenes'

// The panel is its own chunk, so a page downloads it only when its stage mounts.
const DesignPanel = defineAsyncComponent(() => import('@/components/DesignPanel.vue'))

export interface StageDefinition {
  scene: SceneBuilder
  panel?: Component
  panelProps?: Record<string, unknown>
  /** The app nests the layer tree under a "Layers" heading; the stage supplies it. */
  layersHeading?: boolean
  toolbar?: boolean
  /** The scene starts in preview, with the app's pill to reset it or go back to editing. */
  preview?: boolean
}

export const STAGES: Record<StageKind, StageDefinition> = {
  interactive: { scene: SCENES.hero, panel: DesignPanel, preview: true }
}
