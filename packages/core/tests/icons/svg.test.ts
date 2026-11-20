import { describe, expect, test } from 'bun:test'

import { extractPaths } from '#core/icons/svg'

describe('SVG paint', () => {
  test('reads currentColor in any case as the tint an icon color fills', () => {
    const [path] = extractPaths('<path fill="currentcolor" stroke="CurrentColor" d="M0 0h4v4H0z"/>')

    expect(path).toMatchObject({ fill: 'currentColor', stroke: 'currentColor' })
  })

  test('paints currentColor in the color an element sets or inherits, as browsers do', () => {
    const paths = extractPaths(
      '<g color="#f00"><path fill="currentColor" d="M0 0h1v1H0z"/>' +
        '<g style="color: #00f" fill="currentColor"><path d="M0 0h1v1H0z"/></g>' +
        '<path d="M0 0h1v1H0z"/></g>'
    )

    // The second fill is inherited as currentColor and takes its own element's color; a path
    // with no fill keeps the host's color, as SVG's initial fill is not currentColor.
    expect(paths.map((path) => path.fill)).toEqual(['#f00', '#00f', 'currentColor'])
  })
})
