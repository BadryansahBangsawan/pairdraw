import { ownValue } from './record'

/**
 * The computed properties a capture keeps for each element: those `@pairdraw/dom-css` builds
 * layers from, plus margins, which a capture turns into spacing when it is imported.
 */
export const CAPTURED_STYLE_PROPERTIES = [
  'align-items',
  'align-self',
  'aspect-ratio',
  'background-color',
  'border-bottom-color',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'border-bottom-style',
  'border-bottom-width',
  'border-left-color',
  'border-left-style',
  'border-left-width',
  'border-right-color',
  'border-right-style',
  'border-right-width',
  'border-top-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-top-style',
  'border-top-width',
  'bottom',
  'box-shadow',
  'box-sizing',
  'color',
  'column-gap',
  'display',
  'flex-direction',
  'flex-wrap',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'gap',
  'height',
  'justify-content',
  'left',
  'letter-spacing',
  'line-height',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'object-fit',
  'opacity',
  'overflow',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'position',
  'right',
  'row-gap',
  'text-align',
  'text-decoration-color',
  'text-decoration-line',
  'text-decoration-style',
  'text-decoration-thickness',
  'text-indent',
  'text-shadow',
  'text-transform',
  'text-underline-offset',
  'top',
  'white-space',
  'width'
] as const

export type CapturedStyleProperty = (typeof CAPTURED_STYLE_PROPERTIES)[number]

const CAPTURED = new Set<string>(CAPTURED_STYLE_PROPERTIES)

/** Whether a capture keeps this property; others are dropped when a capture is read. */
export function isCapturedStyleProperty(property: string): property is CapturedStyleProperty {
  return CAPTURED.has(property)
}

const SIDES = ['top', 'right', 'bottom', 'left'] as const

/**
 * Values the importer reads exactly as it reads a missing property, so leaving them out only
 * makes the capture smaller. Inherited text properties are always kept: a nested run reads
 * a missing one from its parent, which differs from the value the page computed.
 */
const IMPLIED_VALUES: Partial<Record<CapturedStyleProperty, readonly string[]>> = {
  'align-items': ['normal'],
  'align-self': ['auto'],
  'aspect-ratio': ['auto'],
  'background-color': ['rgba(0, 0, 0, 0)', 'transparent'],
  'box-shadow': ['none'],
  'column-gap': ['normal'],
  'flex-direction': ['row'],
  'flex-wrap': ['nowrap'],
  gap: ['normal'],
  height: ['auto'],
  'justify-content': ['normal'],
  'max-height': ['none'],
  'max-width': ['none'],
  'min-height': ['auto', '0px'],
  'min-width': ['auto', '0px'],
  'object-fit': ['fill'],
  opacity: ['1'],
  overflow: ['visible'],
  'row-gap': ['normal'],
  'text-indent': ['0px'],
  width: ['auto']
}

const ZERO_LENGTH_PROPERTIES = [
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  ...SIDES.map((side) => `padding-${side}` as const),
  ...SIDES.map((side) => `margin-${side}` as const)
]

const TEXT_DECORATION_DETAILS = [
  'text-decoration-color',
  'text-decoration-style',
  'text-decoration-thickness',
  'text-underline-offset'
]

/**
 * The style without values that change nothing on import: defaults, borders without a style,
 * offsets of boxes in normal flow, and decoration details of undecorated text.
 */
export function withoutImpliedValues(style: Record<string, string>): Record<string, string> {
  const dropped = new Set<string>()
  for (const [property, values] of Object.entries(IMPLIED_VALUES)) {
    if (values.includes(ownValue(style, property) ?? '')) dropped.add(property)
  }
  for (const property of ZERO_LENGTH_PROPERTIES) {
    if (style[property] === '0px') dropped.add(property)
  }
  for (const side of SIDES) {
    const borderStyle = ownValue(style, `border-${side}-style`)
    if (borderStyle !== undefined && borderStyle !== 'none' && borderStyle !== 'hidden') continue
    for (const part of ['style', 'width', 'color']) dropped.add(`border-${side}-${part}`)
  }
  // Sticky boxes sit in normal flow until the page scrolls, which a still capture never does.
  const position = ownValue(style, 'position')
  const inFlow = position === undefined || position === 'static' || position === 'sticky'
  if (inFlow) dropped.add('position')
  for (const side of SIDES) {
    if (inFlow || style[side] === 'auto') dropped.add(side)
  }
  const decoration = ownValue(style, 'text-decoration-line')
  if (decoration === undefined || decoration === 'none') {
    for (const property of TEXT_DECORATION_DETAILS) dropped.add(property)
  }
  return Object.fromEntries(Object.entries(style).filter(([property]) => !dropped.has(property)))
}
