import { expect, test } from 'bun:test'

import { useI18n } from '@open-pencil/vue/i18n'

import { isMissingUpdateFeed } from '@/app/shell/updater/feed'
import { updateFailureNotice, updateFailureText } from '@/app/shell/updater/messages'

const { updates: messages } = useI18n()

// What `tauri-plugin-updater` rejects with when `plugins.updater.endpoints` is empty.
const MISSING_FEED_ERROR = 'Updater does not have any endpoints set.'

test('a build without an update feed is told apart from a failed check', () => {
  expect(isMissingUpdateFeed(MISSING_FEED_ERROR)).toBe(true)
  expect(isMissingUpdateFeed('error sending request for url')).toBe(false)
  expect(updateFailureText(messages.value, 'check', MISSING_FEED_ERROR)).toBe(
    messages.value.notConfigured
  )
})

test('a missing release manifest and other check errors keep their own text', () => {
  expect(
    updateFailureText(
      messages.value,
      'check',
      'Could not fetch a valid release JSON from the remote'
    )
  ).toBe(messages.value.unavailable)
  expect(updateFailureText(messages.value, 'check', 'offline')).toBe(
    messages.value.checkFailed({ error: 'offline' })
  )
})

test('a missing feed is shown as information with nothing to retry', () => {
  expect(updateFailureNotice(messages.value, 'check', MISSING_FEED_ERROR)).toEqual({
    text: messages.value.notConfigured,
    tone: 'info',
    retryable: false
  })
  expect(updateFailureNotice(messages.value, 'check', 'offline')).toEqual({
    text: messages.value.checkFailed({ error: 'offline' }),
    tone: 'error',
    retryable: true
  })
  expect(updateFailureNotice(messages.value, 'download', 'reset')).toMatchObject({
    tone: 'error',
    retryable: true
  })
})
