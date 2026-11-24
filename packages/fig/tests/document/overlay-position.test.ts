import { expect, test } from 'bun:test'

import { guid } from '#fig-tests/helpers/guid'
import { materializeDocument } from '#fig/document/materialize'

import type { NodeChange } from '@pairdraw/kiwi/fig/codec'

const PLACEMENTS = [
  'CENTER',
  'TOP_LEFT',
  'TOP_CENTER',
  'TOP_RIGHT',
  'BOTTOM_LEFT',
  'BOTTOM_CENTER',
  'BOTTOM_RIGHT'
] as const

/** A screen that opens `Card` as an overlay, and the destination record's placement. */
function changes(placement?: string): NodeChange[] {
  return [
    { guid: guid(1), type: 'CANVAS' },
    {
      guid: guid(2),
      type: 'FRAME',
      name: 'Screen',
      parentIndex: { guid: guid(1), position: '!' },
      prototypeInteractions: [
        {
          id: guid(7),
          event: { interactionType: 'ON_CLICK' },
          actions: [
            {
              transitionNodeID: guid(3),
              connectionType: 'INTERNAL_NODE',
              navigationType: 'OVERLAY',
              transitionType: 'INSTANT_TRANSITION',
              transitionDuration: 0
            }
          ]
        }
      ]
    },
    {
      guid: guid(3),
      type: 'FRAME',
      name: 'Card',
      parentIndex: { guid: guid(1), position: '"' },
      ...(placement ? { overlayPositionType: placement } : {})
    }
  ] as NodeChange[]
}

function actionOf(placement?: string): unknown {
  const { graph } = materializeDocument(changes(placement))
  const screen = [...graph.getAllNodes()].find((node) => node.name === 'Screen')
  if (!screen) throw new Error('Missing Screen')
  return screen.prototypeReactions[0]?.actions[0]
}

for (const placement of PLACEMENTS) {
  test(`reads an overlay the file places at ${placement}`, () => {
    expect(actionOf(placement)).toMatchObject({ overlayPosition: placement })
  })
}

test('an overlay without a placement, or one the model cannot express, centers', () => {
  expect(actionOf(undefined)).toMatchObject({ overlayPosition: 'CENTER' })
  // Figma's MANUAL placement carries a relative position this model has no field for.
  expect(actionOf('MANUAL')).toMatchObject({ overlayPosition: 'CENTER' })
})
