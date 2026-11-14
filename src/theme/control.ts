export type ControlSize = 'xs' | 'sm' | 'md' | 'lg'

export const controlHeight = {
  xs: 'h-6',
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-9'
} satisfies Record<ControlSize, string>

/**
 * A property field: one step taller than the `xs` control, with the field radius and the UI's
 * 12px type. Selects, inputs, and number fields that override the panel field's size use it, so
 * every row in the properties panel stays the same height.
 */
export const panelField = {
  height: 'h-7',
  minHeight: 'min-h-7',
  radius: 'rounded-field',
  text: 'text-xs'
} as const
