import { describe, expect, test } from 'bun:test'

import { renderJSX } from '@pairdraw/core/design-jsx'
import { SceneGraph } from '@pairdraw/scene-graph'
import type { SceneNode } from '@pairdraw/scene-graph'
import { resolveNodeTextDirection } from '@pairdraw/scene-graph/text/direction'

const ARABIC = 'الطاولة محجوزة لك'

async function renderTexts(): Promise<SceneNode[]> {
  const graph = new SceneGraph()
  await renderJSX(
    graph,
    `<Frame name="RTL variants" w={360} h="hug" flex="col" gap={12} p={20}>
      <Text w="fill" font="Inter" size={20}>${ARABIC}</Text>
      <Text w="fill" font="Inter" size={20} dir="rtl" textAlign="right">${ARABIC}</Text>
      <Text w="fill" font="Inter" size={20}>Pick your table</Text>
    </Frame>`
  )
  return [...graph.getAllNodes()].filter((node) => node.type === 'TEXT')
}

describe('design JSX text direction', () => {
  test('a text without dir keeps the auto direction and resolves as RTL', async () => {
    const [auto, explicit, latin] = await renderTexts()
    expect(auto?.textDirection).toBe('AUTO')
    expect(resolveNodeTextDirection(auto)).toBe('RTL')
    expect(explicit?.textDirection).toBe('RTL')
    expect(latin?.textDirection).toBe('AUTO')
    expect(resolveNodeTextDirection(latin)).toBe('LTR')
  })
})
