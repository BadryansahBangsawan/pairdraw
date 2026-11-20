/**
 * The CSS object model shapes this package reads, its own so a consumer never needs the types of
 * the CSS parser it loads at runtime: the browser's, or `@acemir/cssom` where there is none.
 */
export interface CSSStyleDeclarationLike {
  readonly length: number
  readonly [index: number]: string
  getPropertyValue(property: string): string
}

export interface CSSStyleRuleLike {
  selectorText: string
  style: CSSStyleDeclarationLike
}

export interface CSSGroupingRuleLike {
  cssRules: unknown[]
}

export interface CSSStyleSheetLike {
  cssRules: unknown[]
}
