import { es } from '@pairdraw/emit'

import type { ComponentModel, GeneratedComponent, GeneratedKind } from '../model'
import { kindParameters, type Parameter } from './fields'
import { defaultOf, PRIMITIVE, RADIX } from './radix'

/**
 * The props of a group that fixes one choice at a time, without the `type` it fixes. The
 * root's own props join the single and multiple choice, which a single value can't satisfy.
 */
export const SINGLE_PROPS: Partial<Record<GeneratedKind, string>> = {
  toggleGroup: 'ToggleGroupSingleProps',
  accordion: 'AccordionSingleProps'
}

const qualified = (namespace: string, name: string) => ({
  type: 'TSQualifiedName',
  left: es.identifier(PRIMITIVE(namespace)),
  right: es.identifier(name)
})

/** Props a kind declares itself, where no Radix root has them. */
const OWN_PROPS: Partial<Record<GeneratedKind, string>> = {
  progress: "Omit<ComponentProps<typeof ProgressPrimitive.Root>, 'value'> & { value?: number }",
  numberField:
    "Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> & { defaultValue?: number; onValueChange?: (value: number) => void; disabled?: boolean }",
  textField: "ComponentProps<'input'>",
  textarea: "ComponentProps<'textarea'>"
}

/** The root's own props, or a single choice group's. */
function rootPropsType(kind: GeneratedKind, tag: string): es.SyntaxNode {
  const own = OWN_PROPS[kind]
  if (own) return es.parseType(own)
  // A component without a behaviour takes its root element's props.
  if (kind === 'plain') return es.parseType(`ComponentProps<'${tag}'>`)
  const radix = RADIX[kind]
  if (!radix) return es.parseType("ComponentProps<'button'>")
  const single = SINGLE_PROPS[kind]
  if (single)
    return es.fill(es.parseType("Omit<$Props, 'type'>"), {
      $Props: qualified(radix.namespace, single)
    })
  return es.fill(es.parseType('ComponentProps<typeof $Root>'), {
    $Root: qualified(radix.namespace, radix.parts.root)
  })
}

/** The root's own props, extended with the component's variant props when it has any. */
export function propsType(component: ComponentModel): es.SyntaxNode {
  const base = rootPropsType(component.kind, component.tree.tag)
  const own = [component.props, component.texts, component.booleans, component.slots]
  if (own.every((list) => list.length === 0)) return base
  return {
    type: 'TSIntersectionType',
    types: [
      base,
      es.objectType([
        ...component.props.map((prop): [string, es.SyntaxNode, boolean] => [
          prop.name,
          es.stringUnionType(prop.options),
          true
        ]),
        ...component.texts.map((text): [string, es.SyntaxNode, boolean] => [
          text.name,
          es.parseType('string'),
          true
        ]),
        ...component.booleans.map((prop): [string, es.SyntaxNode, boolean] => [
          prop.name,
          es.parseType('boolean'),
          true
        ]),
        ...component.slots.map((slot): [string, es.SyntaxNode, boolean] => [
          slot.name,
          es.parseType('ReactNode'),
          true
        ])
      ])
    ]
  }
}

/**
 * `{ size = 'Small', label = 'Save', ...props }`: variant and text props with their defaults,
 * kept off the root, and the rest passed on.
 */
export function parameters(component: ComponentModel): es.SyntaxNode {
  const own: Parameter[] = [
    ...kindParameters(component),
    ...[...component.props, ...component.texts].map((prop) => ({
      name: prop.name,
      default: es.string(prop.default)
    })),
    ...component.booleans.map((prop) => ({
      name: prop.name,
      default: es.parseExpression(String(prop.default))
    })),
    // Slots are kept off the root too, which would otherwise get them as attributes.
    ...component.slots.map((slot) => ({ name: slot.name }))
  ]
  if (own.length === 0) return es.identifier('props')
  return {
    type: 'ObjectPattern',
    properties: [
      ...own.map((prop) => ({
        type: 'Property',
        kind: 'init',
        key: es.identifier(prop.name),
        value: prop.default
          ? { type: 'AssignmentPattern', left: es.identifier(prop.name), right: prop.default }
          : es.identifier(prop.name),
        computed: false,
        method: false,
        shorthand: true
      })),
      { type: 'RestElement', argument: es.identifier('props') }
    ]
  }
}

/**
 * `import { useState, type ComponentProps, type ReactNode } from 'react'` with only what the
 * component uses: a number field's state, its root's props, and its slots' content.
 */
export function reactImport(uses: {
  state: boolean
  props: boolean
  slots: boolean
}): es.SyntaxNode[] {
  const types = [...(uses.props ? ['ComponentProps'] : []), ...(uses.slots ? ['ReactNode'] : [])]
  if (!uses.state && types.length === 0) return []
  const specifiers = uses.state
    ? ['useState', ...types.map((name) => `type ${name}`)].join(', ')
    : types.join(', ')
  return es.parseModule(`import ${uses.state ? '' : 'type '}{ ${specifiers} } from 'react'`).body
}

/**
 * The prop a story sets the value with: Radix's uncontrolled value, so a story's control and
 * its play function can both change it, which a slider takes as a list; a progress bar's own
 * value, which nothing else changes.
 */
export function valueArg(
  kind: GeneratedKind,
  model: string | null
): Pick<GeneratedComponent, 'valueArg' | 'valueList'> {
  if (!model) return { valueArg: null }
  if (kind === 'progress') return { valueArg: 'value' }
  return { valueArg: defaultOf(model), ...(kind === 'slider' ? { valueList: true } : {}) }
}
