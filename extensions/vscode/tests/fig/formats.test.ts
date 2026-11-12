import { describe, expect, test } from 'bun:test'

import { designViewType, documentFormat, toggledViewType } from '#vscode/fig/formats'

describe('document formats', () => {
  test('reads the format from the destination, case-insensitively', () => {
    expect(documentFormat('/w/card.pen')).toBe('pen')
    expect(documentFormat('/w/Card.PEN')).toBe('pen')
    expect(documentFormat('/w/drawing.fig')).toBe('fig')
  })

  test('falls back to fig for a name that has neither extension', () => {
    expect(documentFormat('/w/card.pen.bak')).toBe('fig')
  })

  test('opens .fig in Design Mode by default and .pen only when asked', () => {
    expect(designViewType('/w/a.fig')).toBe('pairdraw.fig')
    expect(designViewType('/w/a.pen')).toBe('pairdraw.pen')
    expect(designViewType('/w/a.png')).toBeNull()
  })

  test('toggles between the text editor and the format’s Design Mode', () => {
    expect(toggledViewType('default', '/w/a.pen')).toBe('pairdraw.pen')
    expect(toggledViewType('pairdraw.pen', '/w/a.pen')).toBe('default')
    expect(toggledViewType('pairdraw.fig', '/w/a.fig')).toBe('default')
    expect(toggledViewType('default', '/w/a.png')).toBeNull()
  })
})
