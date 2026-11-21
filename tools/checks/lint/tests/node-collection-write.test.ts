import { describe, expect, test } from 'bun:test'

import { NODE_COLLECTION_FIELDS } from '#lint/rules/quality/node-collection-write.ts'

import { createDefaultNode } from '@pairdraw/scene-graph/node-defaults'

import { lint, ruleDiagnostics } from './helpers/lint.ts'

const rule = 'no-node-collection-write'
const rules = { [`pairdraw/${rule}`]: 'error' }

describe('no-node-collection-write', () => {
  test.each([
    '(node.fills as Fill[]).push(paint)',
    'node.fills!.push(paint)',
    '(node.boundVariables satisfies object).width = id',
    'node.variableBindingScales.width++',
    '--node.variableBindingScales.width',
    'Object.assign(node.boundVariables, { width: id })',
    "Reflect.set(node.boundVariables, 'width', id)",
    "Reflect.deleteProperty(node.boundVariables, 'width')",
    "Object.defineProperty(node.boundVariables, 'width', { value: id })",
    'node.fills.push(paint)',
    'graph.getNode(id)!.strokes.splice(0, 1)',
    'node.effects.sort(byType)',
    'node?.pluginData.unshift(entry)',
    "node.boundVariables[field] = 'VariableID:1:1'",
    'node.boundVariables.width = id',
    'node.variableBindingScales.width += 1',
    "delete node.componentPropertyValues['Label']",
    'node.dashPattern[0] = 4',
    'node.fills.length = 0'
  ])('rejects writing into a node value: %s', async (source) => {
    expect(ruleDiagnostics(await lint(source, rules), rule)).toHaveLength(1)
  })

  test.each([
    'Object.assign({}, node.boundVariables)',
    'Object.assign(node, { fills: [] })',
    "Reflect.get(node.boundVariables, 'width')",
    'node.fills = [...node.fills, paint]',
    'node.boundVariables = { ...node.boundVariables, width: id }',
    'parent.childIds.push(id)',
    'const first = node.fills[0]',
    'node.fills.map(copyFill)',
    'fills.push(paint)',
    'node.fills[0].visible = false',
    'ctx.state.guides.preview = preview',
    'node.boundVariables.width'
  ])('accepts %s', async (source) => {
    expect(ruleDiagnostics(await lint(source, rules), rule)).toHaveLength(0)
  })

  test('covers every value a new layer shares with other layers', () => {
    const node = createDefaultNode(() => '1:1', 'RECTANGLE')
    const shared = Object.entries(node)
      .filter(([, value]) => value !== null && typeof value === 'object' && Object.isFrozen(value))
      .map(([field]) => field)
    expect(shared.length).toBeGreaterThan(0)
    expect(shared.filter((field) => !NODE_COLLECTION_FIELDS.has(field))).toEqual([])
  })
})
