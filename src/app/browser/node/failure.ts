/**
 * A snapshot failure the Design panel can show. Functions return a code. The panel translates
 * it, and the agent is given the English catalog sentence.
 *
 * `browserNodeFailureEnglish` matches the `browser` message defaults for these keys.
 */
export const BROWSER_NODE_FAILURE = {
  desktopOnly: 'desktop-only',
  windowClosed: 'window-closed',
  missingLayer: 'missing-layer',
  notSnapshot: 'not-snapshot',
  emptyAddress: 'empty-address',
  schemeRefused: 'scheme-refused',
  invalidAddress: 'invalid-address',
  noPicture: 'no-picture',
  loadTimeout: 'load-timeout',
  addressUncaptured: 'address-uncaptured',
  failed: 'failed'
} as const

type BrowserNodeFailure = (typeof BROWSER_NODE_FAILURE)[keyof typeof BROWSER_NODE_FAILURE]

/** The catalog strings a heading is chosen from. Each one is a sentence, already translated. */
export interface BrowserNodeFailureCopy {
  desktopOnly: string
  emptyAddress: string
  schemeRefused: string
  invalidAddress: string
  snapshotWindowClosed: string
  snapshotMissingLayer: string
  snapshotNotSnapshot: string
  snapshotNoPicture: string
  snapshotLoadTimeout: string
  snapshotAddressUncaptured: string
  snapshotFailed: string
}

const FAILURE_HEADINGS = {
  [BROWSER_NODE_FAILURE.desktopOnly]: 'desktopOnly',
  [BROWSER_NODE_FAILURE.windowClosed]: 'snapshotWindowClosed',
  [BROWSER_NODE_FAILURE.missingLayer]: 'snapshotMissingLayer',
  [BROWSER_NODE_FAILURE.notSnapshot]: 'snapshotNotSnapshot',
  [BROWSER_NODE_FAILURE.emptyAddress]: 'emptyAddress',
  [BROWSER_NODE_FAILURE.schemeRefused]: 'schemeRefused',
  [BROWSER_NODE_FAILURE.invalidAddress]: 'invalidAddress',
  [BROWSER_NODE_FAILURE.noPicture]: 'snapshotNoPicture',
  [BROWSER_NODE_FAILURE.loadTimeout]: 'snapshotLoadTimeout',
  [BROWSER_NODE_FAILURE.addressUncaptured]: 'snapshotAddressUncaptured',
  [BROWSER_NODE_FAILURE.failed]: 'snapshotFailed'
} as const satisfies Record<BrowserNodeFailure, keyof BrowserNodeFailureCopy>

/** English catalog sentences, for a caller that speaks to a model rather than the panel. */
export const browserNodeFailureEnglish: BrowserNodeFailureCopy = {
  desktopOnly:
    'The built-in browser is part of the desktop app. It opens a page in its own window, which this browser tab cannot do.',
  emptyAddress: 'Type an address to open.',
  schemeRefused: 'The browser opens http and https addresses only.',
  invalidAddress: 'That address is not a page the browser can open.',
  snapshotWindowClosed: 'The browser window is not open.',
  snapshotMissingLayer: 'That layer is not on the canvas.',
  snapshotNotSnapshot: 'That layer is not a browser snapshot.',
  snapshotNoPicture: 'The page returned no picture',
  snapshotLoadTimeout: 'The page did not finish loading.',
  snapshotAddressUncaptured: 'The picture was not of the page that finished loading.',
  snapshotFailed: 'The snapshot could not be updated.'
}

/** The sentence for a panel code. An unknown code uses the generic snapshot failure. */
export function browserNodeFailureHeading(code: string, copy: BrowserNodeFailureCopy): string {
  if (!isBrowserNodeFailure(code)) return copy.snapshotFailed
  return copy[FAILURE_HEADINGS[code]]
}

function isBrowserNodeFailure(code: string): code is BrowserNodeFailure {
  return Object.hasOwn(FAILURE_HEADINGS, code)
}
