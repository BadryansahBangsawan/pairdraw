import { defineRule } from '@oxlint/plugins'
import type { ESTree } from '@oxlint/plugins'

const NODE_LIST_FIELDS: ReadonlySet<string> = new Set([
  'fills',
  'strokes',
  'effects',
  'layoutGrids',
  'guides',
  'fillGeometry',
  'strokeGeometry',
  'textDecorationFills',
  'textParagraphs',
  'styleRuns',
  'fontVariations',
  'fontFeatures',
  'dashPattern',
  'connectorControlPoints',
  'gridTemplateColumns',
  'gridTemplateRows',
  'componentPropertyDefinitions',
  'componentPropertyReferences',
  'symbolLinks',
  'variantPropSpecs',
  'exportSettings',
  'pluginData',
  'pluginRelaunchData',
  'prototypeReactions',
  'editedFields',
  'symbolOverrides',
  'componentPropAssignments',
  'derivedSymbolData'
])

const NODE_RECORD_FIELDS: ReadonlySet<string> = new Set([
  'componentPropertyAssignments',
  'componentPropertyValues',
  'boundVariables',
  'variableBindingScales',
  'variableAssignmentScales',
  'variableModes',
  'rawNodeFields'
])

/**
 * `SceneNode` lists and records, its source metadata's included, that layers share while they
 * are empty (`packages/scene-graph/src/node-defaults.ts`). A layer's `childIds` is not one: the graph grows
 * it in place.
 */
export const NODE_COLLECTION_FIELDS: ReadonlySet<string> = new Set([
  ...NODE_LIST_FIELDS,
  ...NODE_RECORD_FIELDS
])

const MUTATING_METHODS = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin'
])

function memberName(node: ESTree.MemberExpression): string | null {
  if (!node.computed && node.property.type === 'Identifier') return node.property.name
  return null
}

/** Object and Reflect functions that write into their first argument. */
const WRITING_FUNCTIONS: Readonly<Record<string, ReadonlySet<string>>> = {
  Object: new Set(['assign', 'defineProperty', 'defineProperties']),
  Reflect: new Set(['set', 'deleteProperty', 'defineProperty'])
}

/** The expression under optional chaining, parentheses, and type assertions. */
function unwrapChain(node: ESTree.Node): ESTree.Node {
  let current = node
  for (;;) {
    switch (current.type) {
      case 'ChainExpression':
      case 'ParenthesizedExpression':
      case 'TSAsExpression':
      case 'TSSatisfiesExpression':
      case 'TSNonNullExpression':
      case 'TSTypeAssertion':
        current = current.expression
        break
      default:
        return current
    }
  }
}

/** `Object.assign(…)`, `Reflect.set(…)` and the like, which write into their first argument. */
function writesIntoFirstArgument(callee: ESTree.MemberExpression): boolean {
  const owner = unwrapChain(callee.object)
  const name = memberName(callee)
  if (owner.type !== 'Identifier' || name === null) return false
  return WRITING_FUNCTIONS[owner.name]?.has(name) ?? false
}

/** The node field `<expr>.<field>` names, when it is one of the shared lists or records. */
function collectionField(node: ESTree.Node): string | null {
  const unwrapped = unwrapChain(node)
  if (unwrapped.type !== 'MemberExpression') return null
  const name = memberName(unwrapped)
  return name !== null && NODE_COLLECTION_FIELDS.has(name) ? name : null
}

/**
 * The field a write target writes into: any key of a record, and an index or the length of a
 * list. Other properties of a list-named value (`state.guides.preview`) belong to something else.
 */
function writtenField(target: ESTree.Node): string | null {
  const unwrapped = unwrapChain(target)
  if (unwrapped.type !== 'MemberExpression') return null
  const field = collectionField(unwrapped.object)
  if (field === null) return null
  if (NODE_RECORD_FIELDS.has(field)) return field
  return unwrapped.computed || memberName(unwrapped) === 'length' ? field : null
}

/** Disallow writing into a node's lists and records, which layers share while they are empty. */
export const noNodeCollectionWriteRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow writing into a SceneNode's lists and records; replace the value instead."
    },
    messages: {
      write:
        'Give `{{field}}` a new value (spread the old one, or use updateNode) instead of writing into it: layers share it while it is empty, and it is frozen.'
    }
  },
  createOnce(context) {
    const report = (node: ESTree.Node, field: string) =>
      context.report({ node, messageId: 'write', data: { field } })
    return {
      CallExpression(node) {
        const callee = unwrapChain(node.callee)
        if (callee.type !== 'MemberExpression') return
        const target = node.arguments[0]
        if (writesIntoFirstArgument(callee) && target !== undefined) {
          const written = collectionField(target)
          if (written !== null) report(node, written)
          return
        }
        const method = memberName(callee)
        if (method === null || !MUTATING_METHODS.has(method)) return
        const field = collectionField(callee.object)
        if (field !== null && NODE_LIST_FIELDS.has(field)) report(node, field)
      },
      AssignmentExpression(node) {
        const field = writtenField(node.left)
        if (field !== null) report(node, field)
      },
      UpdateExpression(node) {
        const field = writtenField(node.argument)
        if (field !== null) report(node, field)
      },
      UnaryExpression(node) {
        if (node.operator !== 'delete') return
        const field = writtenField(node.argument)
        if (field !== null) report(node, field)
      }
    }
  }
})
