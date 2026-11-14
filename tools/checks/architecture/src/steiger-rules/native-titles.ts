import { parse as parseVueSfc } from 'vue/compiler-sfc'

import { createTextRule, type Rule } from './support.ts'

const VUE_ATTRIBUTE_NODE = 6
const VUE_DIRECTIVE_NODE = 7

type VueTemplateNode = {
  type?: number
  name?: string
  arg?: { content?: string }
  props?: VueTemplateNode[]
  children?: VueTemplateNode[]
  loc?: { start?: { line?: number; column?: number } }
}

function propName(prop: VueTemplateNode) {
  if (prop.type === VUE_ATTRIBUTE_NODE) return prop.name ?? null
  if (prop.type === VUE_DIRECTIVE_NODE && prop.name === 'bind') return prop.arg?.content ?? null
  return null
}

export interface NativeTitle {
  line?: number
  column?: number
}

/** `title` attributes and bindings in an app or SDK Vue template. */
export function nativeTitles(sourceRel: string, content: string): NativeTitle[] {
  if (
    !sourceRel.endsWith('.vue') ||
    (!sourceRel.startsWith('src/') && !sourceRel.startsWith('packages/vue/src/'))
  ) {
    return []
  }
  const { descriptor } = parseVueSfc(content, { filename: sourceRel })
  const template = descriptor.template?.ast
  if (!template) return []
  const found: NativeTitle[] = []
  const visit = (node: VueTemplateNode) => {
    for (const prop of node.props ?? []) {
      if (propName(prop) !== 'title') continue
      found.push({ line: prop.loc?.start?.line, column: prop.loc?.start?.column })
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(template as VueTemplateNode)
  return found
}

export const noNativeTitleAttributesInVue: Rule = createTextRule(
  'pairdraw/no-native-title-attributes-in-vue',
  (sourceRel, content) =>
    nativeTitles(sourceRel, content).map((position) => ({
      message: 'Use Tip/Reka tooltip patterns instead of native title attributes.',
      ...position
    }))
)
