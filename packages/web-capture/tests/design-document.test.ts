import { describe, expect, test } from 'bun:test'

import { capture, element } from '#web-capture-tests/fixtures'

import { webCaptureDesignDocument } from '@pairdraw/web-capture'

describe('capture as a styled DOM', () => {
  test('keeps the root at its drawn size and drops its position and margins', () => {
    const root = {
      ...element('section', {
        display: 'block',
        position: 'absolute',
        top: '40px',
        left: '10px',
        'margin-top': '12px',
        width: '300px',
        'padding-left': '20px'
      }),
      box: { x: 0, y: 0, width: 320, height: 90 }
    }
    const [converted] = webCaptureDesignDocument(capture(root)).children
    expect(converted).toEqual(
      element('section', {
        display: 'block',
        width: '320px',
        height: '90px',
        'padding-left': '20px',
        'box-sizing': 'border-box'
      })
    )
  })

  test('keeps the room margins take as padding of a box around the element', () => {
    const child = element('p', {
      display: 'block',
      'margin-top': '16px',
      'margin-bottom': '-4px',
      'align-self': 'center'
    })
    const [root] = webCaptureDesignDocument(capture(element('div', {}, [child]))).children
    const [spacer] = root?.type === 'element' ? root.children : []
    expect(spacer).toEqual(
      element('div', { display: 'block', 'padding-top': '16px', 'align-self': 'center' }, [
        element('p', { display: 'block' })
      ])
    )
  })

  test('drops margins of inline content and shifts absolute boxes by theirs', () => {
    const inline = element('span', { display: 'inline', 'margin-left': '8px' })
    const absolute = element('div', {
      display: 'block',
      position: 'absolute',
      left: '10px',
      top: '5px',
      'margin-left': '4px',
      'margin-top': '2px'
    })
    const [root] = webCaptureDesignDocument(
      capture(element('div', {}, [inline, absolute]))
    ).children
    expect(root?.type === 'element' && root.children).toEqual([
      element('span'),
      element('div', { display: 'block', position: 'absolute', left: '14px', top: '7px' })
    ])
  })

  test('places an absolute box by its recorded box when its containing block is further up', () => {
    // The badge's offsets are from the card, but its parent layer is the wrapper inside it.
    const badge = {
      ...element('span', {
        display: 'block',
        position: 'absolute',
        top: '8px',
        right: '8px',
        left: '252px',
        'margin-top': '2px'
      }),
      box: { x: 352, y: 210, width: 40, height: 20 }
    }
    const wrapper = {
      ...element('div', { display: 'block' }, [badge]),
      box: { x: 116, y: 216, width: 268, height: 120 }
    }
    const card = {
      ...element('article', { display: 'block', position: 'relative' }, [wrapper]),
      box: { x: 100, y: 200, width: 300, height: 160 }
    }
    const [root] = webCaptureDesignDocument(capture(card)).children
    const [converted] = root?.type === 'element' ? root.children : []
    const [placed] = converted?.type === 'element' ? converted.children : []
    expect(placed).toEqual(
      element('span', {
        display: 'block',
        position: 'absolute',
        top: '-6px',
        right: '8px',
        left: '236px'
      })
    )
  })

  test('lays a grid and a table row out as wrapping and single rows', () => {
    const grid = element('ul', { display: 'grid', 'column-gap': '12px' })
    const row = element('tr', { display: 'table-row' })
    const [root] = webCaptureDesignDocument(capture(element('div', {}, [grid, row]))).children
    expect(root?.type === 'element' && root.children).toEqual([
      element('ul', {
        display: 'flex',
        'flex-direction': 'row',
        'flex-wrap': 'wrap',
        'column-gap': '12px'
      }),
      element('tr', { display: 'flex', 'flex-direction': 'row', 'flex-wrap': 'nowrap' })
    ])
  })

  test('keeps the items of a grid with recorded boxes where the page drew them', () => {
    const cell = (x: number, y: number) => ({
      ...element('li', { display: 'block', 'margin-top': '4px', 'background-color': 'red' }),
      box: { x, y, width: 80, height: 40 }
    })
    const grid = {
      ...element('ul', { display: 'grid', 'column-gap': '4px', 'margin-bottom': '8px' }, [
        cell(110, 54),
        { type: 'text', text: '\n  ' },
        cell(194, 54),
        cell(110, 98)
      ]),
      box: { x: 100, y: 50, width: 168, height: 88 }
    }
    const [root] = webCaptureDesignDocument(capture(element('div', {}, [grid]))).children
    const [spacer] = root?.type === 'element' ? root.children : []
    const placed = {
      position: 'absolute',
      width: '80px',
      height: '40px',
      'box-sizing': 'border-box'
    }
    expect(spacer).toEqual(
      element('div', { display: 'block', 'padding-bottom': '8px' }, [
        element(
          'ul',
          { display: 'block', width: '168px', height: '88px', 'box-sizing': 'border-box' },
          [
            element('li', {
              display: 'block',
              'background-color': 'red',
              ...placed,
              left: '10px',
              top: '4px'
            }),
            element('li', {
              display: 'block',
              'background-color': 'red',
              ...placed,
              left: '94px',
              top: '4px'
            }),
            element('li', {
              display: 'block',
              'background-color': 'red',
              ...placed,
              left: '10px',
              top: '48px'
            })
          ]
        )
      ])
    )
  })

  test('falls back to wrapping rows for a grid with loose text or a missing box', () => {
    const grid = {
      ...element('div', { display: 'grid' }, [{ type: 'text', text: 'Loose' }]),
      box: { x: 0, y: 0, width: 100, height: 20 }
    }
    const [root] = webCaptureDesignDocument(capture(element('div', {}, [grid]))).children
    expect(root?.type === 'element' && root.children).toEqual([
      element('div', { display: 'flex', 'flex-direction': 'row', 'flex-wrap': 'wrap' }, [
        { type: 'text', text: 'Loose' }
      ])
    ])
  })
})
