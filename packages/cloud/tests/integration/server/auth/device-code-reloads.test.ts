import { expect, test } from 'bun:test'

import {
  accountAuthenticationConfig,
  accountAuthenticationRequest,
  createAccountAuthenticationFixture
} from '#cloud-tests/helpers/account-authentication'
import { responseJSON } from '#cloud-tests/helpers/response'
import * as v from 'valibot'

test('a desktop sign-in page can ask for its code again after a few reloads', async () => {
  const fixture = await createAccountAuthenticationFixture({
    config: {
      ...accountAuthenticationConfig,
      trustedOrigins: ['https://editor.example.com']
    }
  })
  try {
    const statuses: number[] = []
    for (let attempt = 0; attempt < 6; attempt++) {
      const issued = await fixture.app.fetch(
        accountAuthenticationRequest('/api/auth/device/code', {
          client_id: 'pairdraw-desktop:reload-test',
          scope: 'openid profile'
        })
      )
      const authorization = await responseJSON(issued, v.object({ user_code: v.string() }))
      const inspected = await fixture.app.fetch(
        accountAuthenticationRequest(`/api/auth/device?user_code=${authorization.user_code}`)
      )
      statuses.push(inspected.status)
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200])
  } finally {
    await fixture.close()
  }
})
