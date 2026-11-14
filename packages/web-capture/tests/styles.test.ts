import { describe, expect, test } from 'bun:test'

import { withoutImpliedValues } from '@pairdraw/web-capture'

describe('captured styles', () => {
  test('leaves out values the importer reads as missing', () => {
    expect(
      withoutImpliedValues({
        display: 'block',
        'background-color': 'rgba(0, 0, 0, 0)',
        'padding-top': '0px',
        'padding-left': '12px',
        opacity: '1',
        position: 'static',
        top: '10px',
        'border-top-style': 'none',
        'border-top-width': '3px',
        'border-top-color': 'rgb(0, 0, 0)',
        'border-left-style': 'solid',
        'border-left-width': '1px',
        'text-decoration-line': 'none',
        'text-decoration-color': 'rgb(0, 0, 0)'
      })
    ).toEqual({
      display: 'block',
      'padding-left': '12px',
      'border-left-style': 'solid',
      'border-left-width': '1px',
      'text-decoration-line': 'none'
    })
  })

  test('keeps inherited text properties, which nested runs would otherwise inherit', () => {
    const text = {
      'font-style': 'normal',
      'letter-spacing': 'normal',
      'white-space': 'normal',
      'text-transform': 'none',
      color: 'rgb(0, 0, 0)'
    }
    expect(withoutImpliedValues(text)).toEqual(text)
  })

  test('treats sticky boxes as in normal flow and keeps absolute offsets', () => {
    expect(withoutImpliedValues({ position: 'sticky', top: '0px' })).toEqual({})
    expect(withoutImpliedValues({ position: 'absolute', top: '4px', left: 'auto' })).toEqual({
      position: 'absolute',
      top: '4px'
    })
  })
})
