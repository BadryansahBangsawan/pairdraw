import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { readHTMLDocument } from '@pairdraw/core/io/formats/html/import'
import { sceneGraphFromStyledHTML } from '@pairdraw/core/io/formats/html/layers'
import type { SceneGraph } from '@pairdraw/scene-graph'
import {
  encodeWebCaptureClipboard,
  readWebCaptureClipboard,
  webCaptureDesignDocument,
  webCaptureToHTML,
  type WebCapture,
  type WebCaptureElement
} from '@pairdraw/web-capture'

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

/**
 * The layers a capture imports as by both routes into a document: pasted from the clipboard, and
 * as the HTML it serializes to, which the CLI's `import` and the `import_html` tool read.
 */
async function importedBothWays(capture: WebCapture): Promise<SceneGraph[]> {
  const read = readWebCaptureClipboard(encodeWebCaptureClipboard(capture).html)
  if (!read?.ok) throw new Error('the capture survives the clipboard')
  const html = await readHTMLDocument(webCaptureToHTML(read.capture))
  return [sceneGraphFromStyledHTML(webCaptureDesignDocument(read.capture)), html.graph]
}

const CAPTURE: WebCapture = {
  format: 'pairdraw/web-capture',
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

  test('places grid items where the page drew them', async () => {
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

    for (const graph of await importedBothWays(grid)) {
      const [frame] = graph.getChildren(graph.getPages()[0]?.id ?? '')
      expect(frame).toMatchObject({ width: 248, height: 84 })
      const cells = graph.getChildren(frame?.id ?? '')
      expect(cells.map(({ x, y, width, height }) => ({ x, y, width, height }))).toEqual([
        { x: 0, y: 0, width: 80, height: 40 },
        { x: 84, y: 0, width: 80, height: 40 },
        { x: 168, y: 0, width: 80, height: 40 },
        { x: 0, y: 44, width: 80, height: 40 }
      ])
    }
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

  test('joins words a page boxed one by one back into one paragraph of text', async () => {
    // Streaming Markdown renderers fade words in, each in an inline-block that draws nothing.
    // Tailwind's reset gives every element a solid border of no width.
    const reset = { 'border-top-style': 'solid', 'border-top-width': '0px' }
    const word = (text: string, width: number, style: Record<string, string> = {}) => ({
      ...element(
        'span',
        {
          ...reset,
          display: 'inline-block',
          'box-sizing': 'border-box',
          'white-space': 'pre-wrap',
          'line-height': '16px',
          'max-width': '100%',
          width: `${width}px`,
          height: '16px',
          ...style
        },
        [{ type: 'text', text }]
      ),
      box: { x: 0, y: 0, width, height: 16 }
    })
    const space = element('span', { ...reset, display: 'inline', 'white-space': 'pre-wrap' }, [
      { type: 'text', text: ' ' }
    ])
    const paragraph: WebCapture = {
      ...CAPTURE,
      root: {
        ...element('p', { display: 'block', 'line-height': '16px', width: '352px' }, [
          element('span', { ...reset, display: 'inline' }, [
            word('Created', 44),
            space,
            word('the', 18)
          ]),
          space,
          element('strong', { display: 'inline', 'font-weight': '600' }, [
            word('expense', 48, { 'font-weight': '600' }),
            space,
            word('dashboard', 62, { 'font-weight': '600' })
          ]),
          word('.', 3)
        ]),
        box: { x: 0, y: 0, width: 352, height: 16 }
      }
    }
    for (const graph of await importedBothWays(paragraph)) {
      const texts = [...graph.getAllNodes()].filter((node) => node.type === 'TEXT')
      expect(texts.map((node) => node.text)).toEqual(['Created the expense dashboard.'])
      expect(texts[0]?.styleRuns).toEqual([{ start: 12, length: 17, style: { fontWeight: 600 } }])
    }
  })

  test('paints a captured gradient background as a gradient fill behind the text', () => {
    const panel: WebCapture = {
      ...CAPTURE,
      root: {
        ...element(
          'section',
          {
            display: 'block',
            'background-image': 'linear-gradient(160deg, rgb(21, 28, 36), rgb(14, 20, 26))',
            color: 'rgb(255, 255, 255)'
          },
          [element('p', { display: 'block' }, [{ type: 'text', text: 'Welcome back' }])]
        ),
        box: { x: 0, y: 0, width: 420, height: 200 }
      }
    }
    const read = readWebCaptureClipboard(encodeWebCaptureClipboard(panel).html)
    if (!read?.ok) throw new Error('the capture survives the clipboard')

    const graph = sceneGraphFromStyledHTML(webCaptureDesignDocument(read.capture))

    const [frame] = graph.getChildren(graph.getPages()[0]?.id ?? '')
    expect(frame?.fills.map((fill) => fill.type)).toEqual(['GRADIENT_LINEAR'])
    const fill = frame?.fills[0]
    if (fill?.type !== 'GRADIENT_LINEAR') throw new Error('Expected a linear gradient')
    expect(fill.gradientStops?.[0]?.color).toMatchObject({ r: 21 / 255, g: 28 / 255, b: 36 / 255 })
    const [paragraph] = graph.getChildren(frame?.id ?? '')
    const [text] = graph.getChildren(paragraph?.id ?? '')
    expect(text?.type).toBe('TEXT')
  })
})
