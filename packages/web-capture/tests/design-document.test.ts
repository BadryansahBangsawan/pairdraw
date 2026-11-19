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

describe('form controls at their painted size', () => {
  test('a stretched checkbox imports as the small square Chrome paints, centered in its box', () => {
    // Chrome honors `width: 100%` on a checkbox: the box is 297×13, but only a 13px glyph
    // paints, centered. The label text after it still starts past the full box width.
    const checkbox = {
      ...element(
        'input',
        {
          display: 'block',
          width: '297px',
          height: '13px',
          'background-color': 'rgb(10, 15, 20)'
        },
        [],
        { type: 'checkbox' }
      ),
      box: { x: 4, y: 8.5, width: 297, height: 13 }
    }
    const label = {
      ...element('label', { display: 'flex', 'align-items': 'center', 'column-gap': '8px' }, [
        checkbox,
        { type: 'text', text: 'Keep this device signed in' }
      ]),
      box: { x: 0, y: 0, width: 420, height: 30 }
    }
    const [root] = webCaptureDesignDocument(capture(element('div', {}, [label]))).children
    const convertedLabel = root?.type === 'element' ? root.children[0] : undefined
    const wrapper = convertedLabel?.type === 'element' ? convertedLabel.children[0] : undefined
    if (wrapper?.type !== 'element') throw new Error('Expected the checkbox box')
    expect(wrapper.computedStyle).toMatchObject({
      display: 'flex',
      width: '297px',
      height: '13px',
      'justify-content': 'center',
      'align-items': 'center'
    })
    const square = wrapper.children[0]
    if (square?.type !== 'element') throw new Error('Expected the checkbox element')
    expect(square.tagName).toBe('input')
    expect(square.computedStyle).toMatchObject({
      width: '13px',
      height: '13px',
      'box-sizing': 'border-box'
    })
  })

  test('a checkbox already at its painted size keeps its box', () => {
    const checkbox = {
      ...element('input', { display: 'inline-block', width: '13px', height: '13px' }, [], {
        type: 'checkbox'
      }),
      box: { x: 0, y: 0, width: 13, height: 13 }
    }
    const [root] = webCaptureDesignDocument(capture(element('div', {}, [checkbox]))).children
    const converted = root?.type === 'element' ? root.children[0] : undefined
    expect(converted?.type === 'element' && converted.computedStyle).toMatchObject({
      width: '13px',
      height: '13px'
    })
    expect(converted?.type === 'element' && converted.computedStyle['margin-left']).toBeUndefined()
  })

  test('a stretched absolute checkbox keeps its placement and margins', () => {
    const checkbox = {
      ...element(
        'input',
        {
          display: 'block',
          position: 'absolute',
          left: '10px',
          top: '6px',
          'margin-left': '4px',
          'margin-top': '2px',
          width: '297px',
          height: '13px'
        },
        [],
        { type: 'checkbox' }
      ),
      box: { x: 14, y: 8, width: 297, height: 13 }
    }
    const [root] = webCaptureDesignDocument(
      capture(element('div', { display: 'block' }, [checkbox]))
    ).children
    const wrapper = root?.type === 'element' ? root.children[0] : undefined
    if (wrapper?.type !== 'element') throw new Error('Expected the checkbox box')
    // The wrapper keeps the room the stretched element took, at the place the page drew it.
    expect(wrapper.computedStyle).toMatchObject({
      display: 'flex',
      width: '297px',
      height: '13px',
      'box-sizing': 'border-box',
      position: 'absolute',
      left: '14px',
      top: '8px'
    })
    const square = wrapper.children[0]
    if (square?.type !== 'element') throw new Error('Expected the checkbox element')
    expect(square.computedStyle).toMatchObject({ width: '13px', height: '13px' })
    // The margins moved to the wrapper, so the square is not offset twice.
    expect(square.computedStyle['margin-left']).toBeUndefined()
    expect(square.computedStyle['margin-top']).toBeUndefined()
  })

  test('a stretched checkbox in flow keeps its margins around the stretched box', () => {
    const checkbox = {
      ...element(
        'input',
        {
          display: 'block',
          'margin-left': '4px',
          'margin-top': '6px',
          width: '297px',
          height: '13px'
        },
        [],
        { type: 'checkbox' }
      ),
      box: { x: 4, y: 6, width: 297, height: 13 }
    }
    const [root] = webCaptureDesignDocument(
      capture(element('div', { display: 'block' }, [checkbox]))
    ).children
    const spacer = root?.type === 'element' ? root.children[0] : undefined
    if (spacer?.type !== 'element') throw new Error('Expected the margin box')
    expect(spacer.computedStyle).toMatchObject({ display: 'block', 'padding-top': '6px' })
    const wrapper = spacer.children[0]
    if (wrapper?.type !== 'element') throw new Error('Expected the checkbox box')
    expect(wrapper.computedStyle).toMatchObject({ display: 'flex', width: '297px' })
    const square = wrapper.children[0]
    if (square?.type !== 'element') throw new Error('Expected the checkbox element')
    expect(square.computedStyle).toMatchObject({ width: '13px', height: '13px' })
    expect(square.computedStyle['margin-top']).toBeUndefined()
  })

  test('a text input keeps its computed size', () => {
    const input = {
      ...element('input', { display: 'inline-block', width: '200px', height: '36px' }, [], {
        type: 'text'
      }),
      box: { x: 0, y: 0, width: 200, height: 36 }
    }
    const [root] = webCaptureDesignDocument(capture(element('div', {}, [input]))).children
    const converted = root?.type === 'element' ? root.children[0] : undefined
    expect(converted?.type === 'element' && converted.computedStyle).toMatchObject({
      width: '200px',
      height: '36px'
    })
  })
})
