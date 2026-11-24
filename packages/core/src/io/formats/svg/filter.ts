import type { ColorProfile } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { formatColor, type SVGExportContext } from './defs'
import { svg, type SVGNode } from './node'

/**
 * A flood's colour, opaque: its alpha goes in `flood-opacity`, which a Display P3 colour would
 * otherwise carry a second time.
 */
export function floodColor(
  color: Color,
  colorSpace: SVGExportContext['colorSpace'],
  documentColorSpace: ColorProfile = 'srgb'
): string {
  return formatColor({ ...color, a: 1 }, 1, colorSpace, documentColorSpace)
}

/** An SVG filter's primitives as they are added, each naming its result uniquely. */
export class FilterBuilder {
  readonly primitives: SVGNode[] = []
  private count = 0

  constructor(
    private readonly id: string,
    private readonly ctx: SVGExportContext
  ) {}

  /** A primitive with as many children as `children` holds. */
  pushElement(
    tag: string,
    attrs: Record<string, string | number | undefined>,
    children: SVGNode[]
  ) {
    this.primitives.push(svg(tag, attrs, ...children))
  }

  /** The colour space the export writes colours in. */
  get colorSpace(): SVGExportContext['colorSpace'] {
    return this.ctx.colorSpace
  }

  /** The document's profile, where its stored colors are. */
  get documentColorSpace(): ColorProfile {
    return this.ctx.documentColorSpace
  }

  /** A new result name, unique in this filter. */
  result(name: string): string {
    this.count += 1
    return `${this.id}_${name}${this.count}`
  }

  push(tag: string, attrs: Record<string, string | number | undefined>, ...children: SVGNode[]) {
    this.primitives.push(svg(tag, attrs, ...children))
  }
}
