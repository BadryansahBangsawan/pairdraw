import { upperFirst } from 'es-toolkit/string'

import type { GeneratedKind } from '../model'

/**
 * The Radix primitive a kind renders, from the unified `radix-ui` package, and the component
 * of it each part uses. Its root takes the value two ways (`checked` and `onCheckedChange`,
 * `pressed`, `open`) and `disabled` itself, so the generated props extend the root's.
 */
export const RADIX: Record<
  GeneratedKind,
  { namespace: string; parts: Record<string, string> } | null
> = {
  button: null,
  switch: { namespace: 'Switch', parts: { root: 'Root', thumb: 'Thumb' } },
  checkbox: { namespace: 'Checkbox', parts: { root: 'Root', indicator: 'Indicator' } },
  toggle: { namespace: 'Toggle', parts: { root: 'Root' } },
  collapsible: {
    namespace: 'Collapsible',
    parts: { root: 'Root', trigger: 'Trigger', content: 'Content' }
  },
  tabs: {
    namespace: 'Tabs',
    parts: { root: 'Root', list: 'List', trigger: 'Trigger', content: 'Content' }
  },
  radioGroup: { namespace: 'RadioGroup', parts: { root: 'Root' } },
  toggleGroup: { namespace: 'ToggleGroup', parts: { root: 'Root' } },
  accordion: { namespace: 'Accordion', parts: { root: 'Root' } },
  radioGroupItem: { namespace: 'RadioGroup', parts: { root: 'Item', indicator: 'Indicator' } },
  toggleGroupItem: { namespace: 'ToggleGroup', parts: { root: 'Item' } },
  accordionItem: {
    namespace: 'Accordion',
    parts: { root: 'Item', trigger: 'Trigger', content: 'Content' }
  },
  slider: {
    namespace: 'Slider',
    parts: { root: 'Root', track: 'Track', range: 'Range', thumb: 'Thumb' }
  },
  progress: { namespace: 'Progress', parts: { root: 'Root', indicator: 'Indicator' } },
  // Radix has no number or text field; these are native inputs in the design's own elements.
  numberField: null,
  textField: null,
  textarea: null,
  // A component without a behaviour is the design's own elements.
  plain: null
}

/** The local name a Radix namespace is imported as, such as `SwitchPrimitive`. */
export const PRIMITIVE = (namespace: string) => `${namespace}Primitive`

/** `defaultChecked`: Radix's uncontrolled value, which a nested control starts from. */
export const defaultOf = (model: string) => `default${upperFirst(model)}`
