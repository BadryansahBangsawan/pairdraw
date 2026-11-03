import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { sceneGraphFromStyledHTML } from '@open-pencil/core/io/formats/html/layers'
import {
  encodeWebCaptureClipboard,
  readWebCaptureClipboard,
  webCaptureDesignDocument,
  type WebCapture,
  type WebCaptureElement
} from '@open-pencil/web-capture'

// A 1×1 transparent PNG.
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

function element(
  tagName: string,
  computedStyle: Record<string, string>,
  children: WebCaptureElement['children'] = [],
  attrs: Record<string, string> = {}
): WebCaptureElement {
  return { type: 'element', tagName, attrs, computedStyle, children }
}

const CAPTURE: WebCapture = {
  format: 'openpencil/web-capture',
  version: 1,
  scope: 'element',
  source: { url: 'https://example.com/pricing/', title: 'Pricing' },
  capturedAt: '2026-11-03T10:00:00.000Z',
  viewport: { width: 1280, height: 800, devicePixelRatio: 1 },
  root: {
    ...element(
      'section',
      {
        display: 'flex',
        'flex-direction': 'column',
        'background-color': 'rgb(250, 250, 250)',
        'padding-top': '24px',
        'padding-left': '24px',
        'border-top-left-radius': '16px',
        width: '272px'
      },
      [
        element('img', { display: 'block', width: '48px', height: '48px' }, [], {
          src: PIXEL,
          alt: 'Logo'
        }),
        element(
          'h2',
          {
            display: 'block',
            'font-size': '24px',
            color: 'rgb(17, 17, 17)',
            'margin-top': '16px'
          },
          [{ type: 'text', text: 'Pro plan' }]
        ),
        element(
          'a',
          { display: 'inline', color: 'rgb(0, 0, 238)' },
          [{ type: 'text', text: 'Buy' }],
          {
            href: 'https://example.com/buy'
          }
        )
      ],
      { class: 'plan' }
    ),
    box: { x: 0, y: 0, width: 320, height: 200 }
  },
  fonts: [],
  truncated: false
}

describe('importing a web capture', () => {
  test('builds styled layers from a capture read off the clipboard, without a CSS runtime', () => {
    const read = readWebCaptureClipboard(encodeWebCaptureClipboard(CAPTURE).html)
    if (!read?.ok) throw new Error('the capture survives the clipboard')

    const graph = sceneGraphFromStyledHTML(webCaptureDesignDocument(read.capture))

    const page = graph.getPages()[0]
    const [card] = graph.getChildren(page?.id ?? '')
    expect(card).toMatchObject({
      type: 'FRAME',
      name: 'plan',
      width: 320,
      height: 200,
      layoutMode: 'VERTICAL',
      topLeftRadius: 16
    })
    expect(card?.fills[0]?.color).toMatchObject({ r: 250 / 255, g: 250 / 255, b: 250 / 255 })
    const [logo, spacer, link] = graph.getChildren(card?.id ?? '')
    expect(logo?.fills[0]?.type).toBe('IMAGE')
    expect(graph.images.size).toBe(1)
    // The heading's margin keeps its room as padding of a box around it.
    expect(spacer).toMatchObject({ type: 'FRAME', paddingTop: 16 })
    expect(link?.type).toBe('TEXT')
  })

  test('places grid items where the page drew them', () => {
    const cell = (x: number, y: number) => ({
      ...element('div', { display: 'block', 'background-color': 'rgb(255, 91, 46)' }),
      box: { x, y, width: 80, height: 40 }
    })
    const grid: WebCapture = {
      ...CAPTURE,
      root: {
        ...element('div', { display: 'grid', 'column-gap': '4px', 'row-gap': '4px' }, [
          cell(0, 0),
          cell(84, 0),
          cell(168, 0),
          cell(0, 44)
        ]),
        box: { x: 0, y: 0, width: 248, height: 84 }
      }
    }

    const graph = sceneGraphFromStyledHTML(webCaptureDesignDocument(grid))

    const [frame] = graph.getChildren(graph.getPages()[0]?.id ?? '')
    expect(frame).toMatchObject({ width: 248, height: 84 })
    const cells = graph.getChildren(frame?.id ?? '')
    expect(cells.map(({ x, y, width, height }) => ({ x, y, width, height }))).toEqual([
      { x: 0, y: 0, width: 80, height: 40 },
      { x: 84, y: 0, width: 80, height: 40 },
      { x: 168, y: 0, width: 80, height: 40 },
      { x: 0, y: 44, width: 80, height: 40 }
    ])
  })

  test('pastes the capture into a document as one undo step named after the page', async () => {
    const editor = createEditor()
    const created = await editor.pasteStyledDocument(webCaptureDesignDocument(CAPTURE), undefined, {
      name: CAPTURE.source.title
    })

    expect(created.map((id) => editor.graph.getNode(id)?.name)).toEqual(['Pricing'])
    editor.undoAction()
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
  })
})
