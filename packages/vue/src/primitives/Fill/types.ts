import type { PrimitiveProps } from 'reka-ui'

import type { Fill } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'

import type { BindingState } from '#vue/controls/binding-provider/types'
import type { BindableValueStateAttrs } from '#vue/primitives/BindableValue/types'

export type FillCategory = 'SOLID' | 'GRADIENT' | 'MESH' | 'IMAGE'

export interface FillActions {
  toSolid: () => void
  toGradient: () => void
  toMesh: () => void
  toImage: () => void
}

export interface FillRootSlotProps {
  fill: Fill
  category: FillCategory
  swatchBackground: string
  transparent: boolean
  actions: FillActions
}

export interface FillRootSlots {
  default?: (props: FillRootSlotProps) => unknown
}

export interface FillSwatchProps extends PrimitiveProps {
  /** Fill represented by the swatch. */
  fill: Fill
  /** Accessible name for the preview. */
  label?: string
  /**
   * Shows the fill as given, even inside a bound field: a variable picker's rows each preview their
   * own variable rather than the one the field is bound to.
   */
  ignoreBinding?: boolean
}

export interface FillSwatchSlotProps {
  fill: Fill
  color: Color
  category: FillCategory
  background: string
  transparent: boolean
  bindingState: BindingState | undefined
  stateAttrs: BindableValueStateAttrs | undefined
}

export interface FillSwatchSlots {
  default?: (props: FillSwatchSlotProps) => unknown
}
