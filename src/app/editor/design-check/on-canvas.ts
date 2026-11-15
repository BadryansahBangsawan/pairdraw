import { computed } from 'vue'

import { appPreferences } from '@/app/settings/preferences/store'
import { DESIGN_ISSUES_ON_CANVAS_INCLUDED } from '@/constants'

/**
 * Whether issues show on the canvas and beside layers and pages: View → Design issues asks for
 * it, in a build that includes the marks (`DESIGN_ISSUES_ON_CANVAS_INCLUDED`).
 */
export const designIssuesOnCanvas = computed(
  () => DESIGN_ISSUES_ON_CANVAS_INCLUDED && appPreferences.value.designCheck.showOnCanvas
)
