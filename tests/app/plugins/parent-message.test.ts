import { expect, test } from 'bun:test'

import { readPluginHostMessage } from '@/app/plugins/sandbox/parent-message'
import {
  PLUGIN_RESULT_MAX_CHARS,
  PLUGIN_SANDBOX_CALL_RESULT,
  PLUGIN_SANDBOX_RUN
} from '@/app/plugins/sandbox/schema'

const parent = {}

function read(data: unknown, source: unknown, parentWindow: object | null): unknown {
  return readPluginHostMessage(data, source, parentWindow)
}

test('a sandbox frame accepts only a validated message from its parent', () => {
  const run = { type: PLUGIN_SANDBOX_RUN, id: 'r1', source: 'return 1' }
  expect(read(run, parent, parent)).toEqual(run)
  expect(read(run, {}, parent)).toBeNull()
  expect(read(run, parent, null)).toBeNull()
  expect(read({ type: 'nope' }, parent, parent)).toBeNull()
  expect(
    read(
      {
        type: PLUGIN_SANDBOX_CALL_RESULT,
        callId: 'c',
        ok: true,
        result: 'x'.repeat(PLUGIN_RESULT_MAX_CHARS + 1)
      },
      parent,
      parent
    )
  ).toBeNull()
  const answer = { type: PLUGIN_SANDBOX_CALL_RESULT, callId: 'c', ok: false, error: 'no' }
  expect(read(answer, parent, parent)).toEqual(answer)
})
