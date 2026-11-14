import { useAIMessages } from '@pairdraw/vue/i18n'

import { MAX_SKILL_DESCRIPTION_LENGTH, MAX_SKILL_NAME_LENGTH } from '@/app/ai/skills/parse'
import { builtinSkillName, type BuiltinSkillName } from '@/app/ai/skills/sources/builtin'
import type { SkillUploadFailure } from '@/app/ai/skills/sources/uploaded'
import type { Skill, SkillParseError, SkillWarning } from '@/app/ai/skills/types'

/** What a skill's warnings, read errors, and upload failures say, in the user's language. */
export function useSkillMessages() {
  const ai = useAIMessages()

  function warning(code: SkillWarning): string {
    const messages: Record<SkillWarning, string> = {
      'plain-frontmatter': ai.value.skillWarningPlainFrontmatter,
      'name-from-folder': ai.value.skillWarningNameFromFolder,
      'long-name': ai.value.skillWarningLongName({ max: MAX_SKILL_NAME_LENGTH }),
      'name-format': ai.value.skillWarningNameFormat,
      'name-mismatch': ai.value.skillWarningNameMismatch,
      'long-description': ai.value.skillWarningLongDescription({
        max: MAX_SKILL_DESCRIPTION_LENGTH
      })
    }
    return messages[code]
  }

  function error(parseError: SkillParseError): string {
    if (parseError.code === 'invalid-frontmatter') {
      return ai.value.skillErrorInvalidFrontmatter({ detail: parseError.detail })
    }
    const messages: Record<Exclude<SkillParseError['code'], 'invalid-frontmatter'>, string> = {
      'no-frontmatter': ai.value.skillErrorNoFrontmatter,
      'no-description': ai.value.skillErrorNoDescription,
      'no-name': ai.value.skillErrorNoName
    }
    return messages[parseError.code]
  }

  function uploadFailure(failure: SkillUploadFailure): string {
    if (failure.reason === 'invalid') return error(failure.error)
    const messages: Record<Exclude<SkillUploadFailure['reason'], 'invalid'>, string> = {
      'too-large': ai.value.skillsUploadTooLarge,
      'no-skill': ai.value.skillsUploadNoSkill,
      'several-skills': ai.value.skillsUploadSeveral,
      unreadable: ai.value.skillsUploadUnreadable
    }
    return messages[failure.reason]
  }

  /**
   * What a skill is for, as a list shows it: the built-in skills in the user's language, the
   * rest as their SKILL.md describes them. The model always reads the SKILL.md description.
   */
  function description(skill: Pick<Skill, 'source' | 'name' | 'description'>): string {
    const name = builtinSkillName(skill)
    if (name === null) return skill.description
    const summaries: Record<BuiltinSkillName, string> = {
      'landing-page': ai.value.builtinSkillLandingPage,
      'mobile-app': ai.value.builtinSkillMobileApp,
      'web-app': ai.value.builtinSkillWebApp,
      dashboard: ai.value.builtinSkillDashboard,
      slides: ai.value.builtinSkillSlides,
      'design-system': ai.value.builtinSkillDesignSystem,
      'tailwind-v4': ai.value.builtinSkillTailwindV4,
      layout: ai.value.builtinSkillLayout,
      restyle: ai.value.builtinSkillRestyle,
      'dark-mode': ai.value.builtinSkillDarkMode,
      'design-review': ai.value.builtinSkillDesignReview
    }
    return summaries[name]
  }

  return { warning, error, uploadFailure, description }
}
