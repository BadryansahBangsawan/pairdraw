import { describe, expect, test } from 'bun:test'

import { runTool, setupToolTest } from '#core-tests/helpers/tools'

/** A Card frame with a Title on the page. */
function document() {
  const { graph, figma } = setupToolTest()
  const card = figma.createFrame()
  card.name = 'Card'
  card.resize(200, 100)
  const title = figma.createText()
  title.name = 'Title'
  card.appendChild(title)
  return { graph, figma, card: card.id }
}

interface Created {
  set_id: string
  original_id: string
  versions: Array<{ id: string; name: string }>
  next: string
}

function created(result: unknown): Created {
  if (!result || typeof result !== 'object' || !('set_id' in result)) {
    throw new Error(`Not created: ${JSON.stringify(result)}`)
  }
  return result as Created
}

describe('variation tools', () => {
  test('create_variations makes labelled versions and list_variations reads them back', async () => {
    const { figma, card } = document()
    const made = created(
      await runTool(figma, 'create_variations', { id: card, count: '2', labels: ['Calmer'] })
    )
    expect(made.original_id).toBe(card)
    expect(made.versions.map((version) => version.name)).toEqual(['V1 · Calmer', 'V2'])
    // What to do next: change each version inside, keeping its root, and leave the pick.
    expect(made.next).toContain('pick_variation')
    expect(made.next).toContain('keep')

    expect(await runTool(figma, 'list_variations', { id: made.versions[1].id })).toEqual({
      sets: [
        { set_id: made.set_id, original: { id: card, name: 'Card' }, versions: made.versions }
      ]
    })
    expect(await runTool(figma, 'list_variations', {})).toMatchObject({
      sets: [{ set_id: made.set_id }]
    })
  })

  test('a version rewritten with render replace_id stays in its set', async () => {
    const { figma, card } = document()
    const made = created(await runTool(figma, 'create_variations', { id: card, count: 1 }))
    const rendered = await runTool(figma, 'render', {
      replace_id: made.versions[0].id,
      jsx: '<Frame name="V1 · Bold" w={240} h={120} bg="#111111"><Text name="Title">Hi</Text></Frame>'
    })
    expect(rendered).toMatchObject({ name: 'V1 · Bold' })
    expect(await runTool(figma, 'list_variations', { id: made.set_id })).toMatchObject({
      sets: [{ versions: [{ name: 'V1 · Bold' }] }]
    })
  })

  test('pick_variation keeps one version in place of the original, or discards them all', async () => {
    const { graph, figma, card } = document()
    const made = created(await runTool(figma, 'create_variations', { id: card, count: 2 }))
    graph.updateNode(made.versions[1].id, { cornerRadius: 20 })

    expect(
      await runTool(figma, 'pick_variation', { set_id: made.set_id, keep: made.versions[1].id })
    ).toEqual({ original_id: card, kept: made.versions[1].id, removed: 1 })
    expect(graph.getNode(card)).toMatchObject({ name: 'Card', cornerRadius: 20 })
    expect(graph.getNode(made.set_id)).toBeUndefined()

    const again = created(await runTool(figma, 'create_variations', { id: card, count: 1 }))
    expect(await runTool(figma, 'pick_variation', { set_id: again.set_id, keep: null })).toEqual({
      original_id: card,
      kept: null,
      removed: 1
    })
    expect(graph.getNode(again.set_id)).toBeUndefined()
  })

  test('a version whose root was replaced by another kind of layer is refused', async () => {
    const { figma } = document()
    const button = figma.createComponent()
    button.name = 'Button'
    const instance = button.createInstance()
    const made = created(await runTool(figma, 'create_variations', { id: instance.id, count: 1 }))
    const rendered = await runTool(figma, 'render', {
      replace_id: made.versions[0].id,
      jsx: '<Frame name="V1 · Pill" w={120} h={40} rounded={20} bg="#111111" />'
    })
    if (!rendered || typeof rendered !== 'object' || !('id' in rendered)) throw new Error('no render')
    const picked = await runTool(figma, 'pick_variation', {
      set_id: made.set_id,
      keep: rendered.id
    })
    expect(picked).toMatchObject({ error: expect.stringContaining('different kind of layer') })
    expect(figma.getNodeById(instance.id)?.type).toBe('INSTANCE')
  })

  test('refusals name what to do', async () => {
    const { figma, card } = document()
    await expect(runTool(figma, 'create_variations', { id: card, count: 9 })).rejects.toThrow('count')
    expect(
      await runTool(figma, 'create_variations', { id: card, count: 1, labels: ['a', 'b'] })
    ).toEqual({ error: '2 labels for 1 versions' })
    expect(await runTool(figma, 'pick_variation', { set_id: card, keep: null })).toEqual({
      error: `"${card}" is not in a set of variations`
    })
  })
})
