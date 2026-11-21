/**
 * What `figma` and its objects have beyond Figma's Plugin API. `compatibility.ts` checks the
 * types against these lists and `tests/figma-api/surface.test.ts` checks what scripts can reach.
 * A feature Figma has no API for goes on `pairdraw`, never on these lists; entries only leave.
 */

/** Members a host or tool wires up on `figma`, which scripts do not write against. */
export const FIGMA_API_HOST_MEMBERS = [
  'graph',
  'wrapNode',
  'currentPageId',
  'groupFitOptions',
  'setRenderer',
  'theme',
  'exportImage',
  'exportGraphImage',
  'icons',
  'rasterCodec',
  'changeBaseline'
] as const

/**
 * Members named as in Figma whose types do not match Figma's yet, mostly because node proxies do
 * not implement every Figma node type; remove one when it matches.
 */
export const FIGMA_API_INCOMPLETE_MEMBERS = [
  'createComponentFromNode',
  'createPage',
  'currentPage',
  'getNodeById',
  'getNodeByIdAsync',
  'mixed',
  'root',
  'ui',
  'variables',
  'viewport'
] as const

/**
 * Members hosts read or write beyond Figma's Plugin API: the `JSON.stringify` hook, and node
 * fields stored in `.fig` that the installed typings do not name.
 */
export const SERIALIZATION_MEMBERS = ['toJSON', 'scrollBehavior'] as const
