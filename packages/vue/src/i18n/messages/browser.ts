import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const browserMessageDefaults = {
  title: 'Browser',
  openBrowser: 'Open the browser',
  address: 'Address',
  addressPlaceholder: 'example.com',
  open: 'Open',
  back: 'Back',
  forward: 'Forward',
  reload: 'Reload',
  zoom: 'Zoom',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomValue: params('{percent}%'),
  device: 'Device',
  deviceDesktop: 'Desktop',
  devicePhoneNarrow: 'Phone, 390 by 844',
  devicePhoneWide: 'Phone, 412 by 915',
  deviceTablet: 'Tablet, 820 by 1180',
  desktopOnly:
    'The built-in browser is part of the desktop app. It opens a page in its own window, which this browser tab cannot do.',
  emptyAddress: 'Type an address to open.',
  schemeRefused: 'The browser opens http and https addresses only.',
  invalidAddress: 'That address is not a page the browser can open.',
  commandFailed: params('The browser could not do that: {error}'),
  close: 'Close',
  importPage: 'Import page',
  importElement: 'Import element',
  importEmpty: 'The page had nothing to import.',
  pickCancelled: 'The pick was cancelled.',
  shotVisible: 'Screenshot of the view',
  shotFull: 'Screenshot of the page',
  shotElement: 'Screenshot of an element'
} as const

export const browserMessages = i18n('browser', browserMessageDefaults)
