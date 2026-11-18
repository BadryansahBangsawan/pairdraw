import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import { setReactions } from '#core/tools/modify/reactions'
import { getReactions } from '#core/tools/read/reactions'
import { parseToolArgs } from '#core/tools/schema'

/** A home frame with a button on it, and the frame the button should open. */
function screen() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const home = figma.createFrame()
  home.name = 'Home'
  const details = figma.createFrame()
  details.name = 'Details'
  const button = figma.createRectangle()
  button.name = 'Open'
  home.appendChild(button)
  return { figma, graph, home, details, button }
}

/** A click on the layer that navigates to `destinationId`, as Figma's plugin API spells it. */
function clickTo(destinationId: string) {
  return {
    trigger: { type: 'ON_CLICK' as const },
    actions: [
      {
        type: 'NODE' as const,
        destinationId,
        navigation: 'NAVIGATE' as const,
        transition: { type: 'DISSOLVE' as const, duration: 0.3 },
        overlayRelativePosition: 'CENTER' as const
      }
    ]
  }
}

describe('prototype reactions in the plugin shape', () => {
  test('reads back what it wrote, with the frame as the destination', () => {
    const { graph, details, button } = screen()

    Reflect.set(button, 'reactions', [clickTo(details.id)])

    expect(button.reactions).toMatchObject([clickTo(details.id)])
    expect(graph.getNode(details.id)?.prototypeReactions).toEqual([])
  })

  test('keeps the reaction id it had when the connection is rewritten', () => {
    const { graph, details, button } = screen()

    Reflect.set(button, 'reactions', [clickTo(details.id)])
    const before = graph.getNode(button.id)?.prototypeReactions[0]?.id
    Reflect.set(button, 'reactions', [clickTo(details.id)])
    const after = graph.getNode(button.id)?.prototypeReactions[0]?.id

    expect(before).toBeDefined()
    expect(after).toBe(before)
  })

  test('reads a timeout in seconds, which is how the play schedules it', () => {
    const { details, button } = screen()

    Reflect.set(button, 'reactions', [
      {
        trigger: { type: 'AFTER_TIMEOUT', timeout: 2.5 },
        actions: [{ type: 'NODE', destinationId: details.id, navigation: 'NAVIGATE' }]
      }
    ])

    expect(button.reactions[0]?.trigger).toEqual({ type: 'AFTER_TIMEOUT', timeout: 2.5 })
    expect(button.reactions[0]?.actions[0]?.type).toBe('NODE')
  })

  test('refuses a trigger the play cannot start from', () => {
    const { details, button } = screen()

    expect(() => {
      Reflect.set(button, 'reactions', [
        {
          trigger: { type: 'ON_DRAG' },
          actions: [{ type: 'NODE', destinationId: details.id, navigation: 'NAVIGATE' }]
        }
      ])
    }).toThrow('ON_CLICK or AFTER_TIMEOUT')
  })

  test('refuses an action the play cannot run', () => {
    const { button } = screen()

    expect(() => {
      Reflect.set(button, 'reactions', [
        { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'URL', url: 'https://example.com' }] }
      ])
    }).toThrow('NODE, BACK or CLOSE')
  })

  test('refuses a destination that is not a top-level frame on the page', () => {
    const { button } = screen()

    expect(() => {
      Reflect.set(button, 'reactions', [clickTo(button.id)])
    }).toThrow('top-level frame on the same page')
  })
})

describe('prototype connection tools', () => {
  test('set_reactions writes what get_reactions reads back', async () => {
    const { figma, details, button } = screen()
    const connection = clickTo(details.id)

    const written = await setReactions.execute(figma, {
      id: button.id,
      reactions: [connection]
    })
    const read = await getReactions.execute(figma, { id: button.id })

    expect(written).toMatchObject({ id: button.id, reactions: [connection] })
    expect(read).toMatchObject({ id: button.id, reactions: [connection] })
  })

  test('set_reactions refuses a trigger the play cannot start from', () => {
    const { button } = screen()

    // The tool contract rejects it before it can reach the layer, naming the allowed triggers.
    expect(() =>
      parseToolArgs('set_reactions', setReactions.input, {
        id: button.id,
        reactions: [
          {
            trigger: { type: 'MOUSE_ENTER' },
            actions: [{ type: 'NODE', destinationId: button.id, navigation: 'NAVIGATE' }]
          }
        ]
      })
    ).toThrow('ON_CLICK')
  })
})
