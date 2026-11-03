import { describe, expect, test } from 'bun:test'

import type { PenNode } from '@open-pencil/pen'

import { expectDefined, getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'
import { penPluginData } from './helpers/plugin-data'

const RED = { r: 1, g: 0, b: 0, a: 1 }

describe('parsePenFile — script and browser nodes', () => {
  test('reads a script node as a dashed, clipped placeholder labelled with its file', () => {
    const graph = parseDocument([
      {
        id: 'chart',
        type: 'script',
        x: 10,
        y: 20,
        width: 200,
        height: 120,
        scriptUri: './scripts/chart.js',
        inputs: { bars: 5, color: '#FF0000' }
      }
    ])
    const chart = getNodeOrThrow(graph, 'chart')
    expect(chart.type).toBe('FRAME')
    expect([chart.x, chart.y, chart.width, chart.height]).toEqual([10, 20, 200, 120])
    expect(chart.clipsContent).toBe(true)
    expect(chart.fills).toHaveLength(1)
    expect(chart.strokes[0]?.dashPattern).toEqual([4, 4])
    expect(penPluginData(chart, 'type')).toBe('script')
    expect(penPluginData(chart, 'scriptUri')).toBe('./scripts/chart.js')
    expect(penPluginData(chart, 'inputs')).toEqual({ bars: 5, color: '#FF0000' })
    const label = expectDefined(graph.getChildren(chart.id).at(0), 'label')
    expect(label.text).toBe('./scripts/chart.js')
    expect(penPluginData(label, 'generated')).toBe('placeholder')
  })

  test('reads a browser node as a placeholder labelled with its page, keeping its view', () => {
    const graph = parseDocument([
      {
        id: 'site',
        type: 'browser',
        width: 390,
        height: 844,
        cornerRadius: 12,
        url: 'https://example.com',
        deviceId: 'iphone-15',
        zoom: 0.5,
        scrollY: 300
      }
    ])
    const site = getNodeOrThrow(graph, 'site')
    expect(site.cornerRadius).toBe(12)
    expect(penPluginData(site, 'type')).toBe('browser')
    expect(penPluginData(site, 'url')).toBe('https://example.com')
    expect(penPluginData(site, 'deviceId')).toBe('iphone-15')
    expect(penPluginData(site, 'zoom')).toBe(0.5)
    expect(penPluginData(site, 'scrollY')).toBe(300)
    expect(graph.getChildren(site.id).map((node) => node.text)).toEqual(['https://example.com'])
  })

  test('keeps the paint and clipping pen.dev gives a placeholder', () => {
    const graph = parseDocument([
      {
        id: 'site',
        type: 'browser',
        fill: '#FF0000',
        stroke: '#FF0000',
        strokeWidth: 2,
        clip: false
      }
    ])
    const site = getNodeOrThrow(graph, 'site')
    expect(site.fills.map((fill) => fill.color)).toEqual([RED])
    expect(site.strokes.map((stroke) => [stroke.weight, stroke.dashPattern])).toEqual([[2, []]])
    expect(site.clipsContent).toBe(false)
  })

  test('keeps the layers a script node was saved with instead of a label', () => {
    const graph = parseDocument([
      {
        id: 'chart',
        type: 'script',
        scriptUri: 'chart.js',
        children: [{ id: 'bar', type: 'rectangle', width: 10, height: 40 }]
      }
    ])
    expect(graph.getChildren('chart').map((node) => node.id)).toEqual(['bar'])
  })

  test('labels a browser node without a page with its name', () => {
    const graph = parseDocument([{ id: 'empty', type: 'browser', name: 'Preview' }])
    expect(graph.getChildren('empty').map((node) => node.text)).toEqual(['Preview'])
  })

  test('gives an instance’s placeholder the page its override sets', () => {
    const card: PenNode = {
      id: 'card',
      type: 'frame',
      reusable: true,
      children: [{ id: 'site', type: 'browser', url: 'https://example.com' }]
    }
    const graph = parseDocument([
      card,
      {
        id: 'copy',
        type: 'ref',
        ref: 'card',
        descendants: { site: { url: 'https://example.org' } }
      }
    ])
    const site = expectDefined(graph.getChildren('copy').at(0), 'site')
    expect(penPluginData(site, 'url')).toBe('https://example.org')
    expect(penPluginData(site, 'type')).toBe('browser')
  })
})
