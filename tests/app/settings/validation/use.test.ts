import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'
import { effectScope, ref } from 'vue'

import { useSettingsValidation } from '@/app/settings/validation/use'

const schema = ref(
  v.object({
    project: v.pipe(
      v.string(),
      v.check((project) => /^[a-z-]+$/.test(project), 'Use lowercase letters.')
    )
  })
)

function validation(project: string) {
  const values = ref<Record<string, string | boolean>>({ project })
  const scope = effectScope()
  const form = scope.run(() => useSettingsValidation(values, schema))
  if (!form) throw new Error('validation did not start')
  return { values, form, stop: () => scope.stop() }
}

describe('settings validation', () => {
  test('answers for the values it was asked about', async () => {
    const wrong = validation('My-Project')
    expect(await wrong.form.validate()).toBe(false)
    wrong.stop()

    const right = validation('my-project')
    expect(await right.form.validate()).toBe(true)
    right.stop()
  })

  test('a field corrected while the check runs is not what was submitted', async () => {
    const { values, form, stop } = validation('My-Project')
    // Save is pressed with a mistyped value, and the field is corrected before the check answers.
    const pressed = form.validate()
    values.value = { project: 'my-project' }
    expect(await pressed).toBe(false)
    // The corrected value passes once it is submitted itself.
    expect(await form.validate()).toBe(true)
    stop()
  })
})
