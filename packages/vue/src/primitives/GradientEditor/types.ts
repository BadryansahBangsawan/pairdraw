import type { PrimitiveProps } from 'reka-ui'

import type { ColorProfile, GradientStop } from '@pairdraw/scene-graph'

export interface GradientEditorStopProps extends PrimitiveProps {
  stop: GradientStop
  index: number
  active: boolean
  dragging?: boolean
  interactive?: boolean
  removable?: boolean
  positionStep?: number
  label?: string
  /** The profile the stop's color is stored in; the hex reads it as the sRGB color drawn. */
  colorProfile?: ColorProfile
}

export interface GradientEditorStopActions {
  select: () => void
  updatePosition: (position: number) => void
  updateColor: (hex: string) => void
  updateOpacity: (opacity: number) => void
  remove: () => void
}

export interface GradientEditorStopSlotProps {
  stop: GradientStop
  index: number
  active: boolean
  selected: boolean
  dragging: boolean
  positionPercent: number
  opacityPercent: number
  hex: string
  css: string
  actions: GradientEditorStopActions
}

export interface GradientEditorStopSlots {
  default?: (props: GradientEditorStopSlotProps) => unknown
}
