import { usePreferredReducedMotion } from '@vueuse/core'
import { computed } from 'vue'

import { appPreferences, updateAnimationPreference } from '@/app/settings/preferences/store'

const preferredMotion = usePreferredReducedMotion()
export const animationPreference = computed({
  get: () => appPreferences.value.appearance.animations,
  set: updateAnimationPreference
})
/** Animations play unless turned off, reduced by the system, or left out by Ultralight mode. */
export const animationsEnabled = computed(
  () =>
    animationPreference.value === 'system' &&
    preferredMotion.value !== 'reduce' &&
    !appPreferences.value.rendering.ultralight
)
