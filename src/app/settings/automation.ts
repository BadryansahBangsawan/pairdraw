import { isEmptyObject } from 'es-toolkit'
import * as v from 'valibot'

import { allRules } from '@pairdraw/core/lint'
import { AVAILABLE_LOCALES, locale, setLocale, type Locale } from '@pairdraw/vue/i18n'

import { agentStepLimitSchema } from '@/app/ai/reply/schema'
import { applySnappingPreferences } from '@/app/settings/preferences/apply'
import { nudgeDistanceSchema } from '@/app/settings/preferences/schema'
import {
  ANIMATION_PREFERENCES,
  appPreferences,
  CANVAS_RENDERING_MODES,
  CHANGE_PREVIEW_SIZES,
  DESIGN_CHECK_PRESETS,
  REASONING_DISPLAYS,
  updateDesignCheckPreferences,
  updateNudgePreferences,
  type AppPreferences
} from '@/app/settings/preferences/store'
import { APP_THEMES, type AppTheme } from '@/app/settings/theme'
import { accentPreferenceSchema } from '@/app/shell/accent/schema'
import { getAppTheme, setAppTheme } from '@/app/shell/theme'

/**
 * The editor preferences that automation clients (CLI, MCP) may read and change.
 * Credentials, model profiles, MCP connections, storage, and tool access stay out:
 * an agent must not be able to grant itself access or read secrets.
 */
export interface AutomationSettings {
  appearance: {
    theme: AppTheme
    language: Locale
    animations: AppPreferences['appearance']['animations']
    accent: AppPreferences['appearance']['accent']
  }
  editing: AppPreferences['editing']
  rendering: AppPreferences['rendering']
  recovery: AppPreferences['recovery']
  chat: AppPreferences['chat']
  designCheck: AppPreferences['designCheck']
}

const optionalBooleanSchema = v.optional(v.boolean())

const automationSettingsPatchSchema = v.strictObject({
  appearance: v.optional(
    v.strictObject({
      theme: v.optional(v.picklist(APP_THEMES)),
      language: v.optional(v.picklist(AVAILABLE_LOCALES)),
      animations: v.optional(v.picklist(ANIMATION_PREFERENCES)),
      accent: v.optional(accentPreferenceSchema)
    })
  ),
  editing: v.optional(
    v.strictObject({
      snapping: v.optional(
        v.strictObject({
          geometry: optionalBooleanSchema,
          objects: optionalBooleanSchema,
          pixelGrid: optionalBooleanSchema,
          halfPixel: optionalBooleanSchema
        })
      ),
      nudge: v.optional(
        v.strictObject({
          small: v.optional(nudgeDistanceSchema),
          large: v.optional(nudgeDistanceSchema)
        })
      )
    })
  ),
  rendering: v.optional(
    v.strictObject({
      canvasMode: v.optional(v.picklist(CANVAS_RENDERING_MODES)),
      ultralight: optionalBooleanSchema
    })
  ),
  recovery: v.optional(v.strictObject({ enabled: optionalBooleanSchema })),
  chat: v.optional(
    v.strictObject({
      reasoningDisplay: v.optional(v.picklist(REASONING_DISPLAYS)),
      maxAgentSteps: v.optional(agentStepLimitSchema),
      changePreviewSize: v.optional(v.picklist(CHANGE_PREVIEW_SIZES))
    })
  ),
  designCheck: v.optional(
    v.strictObject({
      preset: v.optional(v.picklist(DESIGN_CHECK_PRESETS)),
      disabledRules: v.optional(v.array(v.picklist(Object.keys(allRules))))
    })
  )
})

export function readAutomationSettings(): AutomationSettings {
  // Copy leaf groups: stored preferences can hold reactive proxies that cannot be cloned.
  const preferences = appPreferences.value
  return {
    appearance: {
      theme: getAppTheme(),
      language: locale.get(),
      animations: preferences.appearance.animations,
      accent: { ...preferences.appearance.accent }
    },
    editing: {
      snapping: { ...preferences.editing.snapping },
      nudge: { ...preferences.editing.nudge }
    },
    rendering: { ...preferences.rendering },
    recovery: { ...preferences.recovery },
    chat: { ...preferences.chat },
    designCheck: {
      ...preferences.designCheck,
      disabledRules: [...preferences.designCheck.disabledRules]
    }
  }
}

/** Validates a partial settings object, applies it through the owning stores, and returns the result. */
export function updateAutomationSettings(input: unknown): AutomationSettings {
  const result = v.safeParse(automationSettingsPatchSchema, input)
  if (!result.success) {
    const issue = result.issues[0]
    const path = v.getDotPath(issue)
    throw new Error(`Invalid settings${path ? ` at "${path}"` : ''}: ${issue.message}`)
  }
  const patch = result.output

  const { theme, language, ...appearance } = patch.appearance ?? {}
  if (theme) setAppTheme(theme)
  if (language) setLocale(language)

  const current = appPreferences.value
  appPreferences.value = {
    ...current,
    appearance: { ...current.appearance, ...appearance },
    rendering: { ...current.rendering, ...patch.rendering },
    recovery: { ...current.recovery, ...patch.recovery },
    chat: { ...current.chat, ...patch.chat }
  }
  if (patch.editing?.snapping) applySnappingPreferences(patch.editing.snapping)
  if (patch.editing?.nudge) updateNudgePreferences(patch.editing.nudge)
  if (patch.designCheck && !isEmptyObject(patch.designCheck))
    updateDesignCheckPreferences(patch.designCheck)

  return readAutomationSettings()
}
