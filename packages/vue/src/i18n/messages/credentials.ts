import { i18n } from '#vue/i18n/create'

export const credentialsMessageDefaults = {
  checkFailed: 'Could not check access to saved credentials.',
  retryCheck: 'Retry check',
  retryAccess: 'Retry access',
  settingsTitle: 'Saved credentials',
  accessPaused: 'Access to saved credentials is paused.',
  rememberDevice: 'Remember API keys on this device',
  sessionOnly: 'Keys are kept only until you close this session.',
  retryFailed: 'Could not reset credential access. Try again.',
  storeLocked:
    'The system credential store is locked. Unlock it, then choose Retry access in General settings.',
  storeUnavailable:
    'Pairdraw cannot reach the system credential store. On Linux, start a keyring such as GNOME Keyring; for the Snap, run “snap connect pairdraw:password-manager-service”. Then choose Retry access in General settings.',
  savedReplace: 'Key saved — enter new to replace',
  apiKey: 'API key',
  accessKey: 'Access key',
  getAPIKey: 'Get API key'
} as const

export const credentialsMessages = i18n('credentials', credentialsMessageDefaults)
