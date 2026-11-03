import { partition } from 'es-toolkit'

import darkMode from '../builtin/dark-mode/SKILL.md?raw'
import dashboard from '../builtin/dashboard/SKILL.md?raw'
import designReview from '../builtin/design-review/SKILL.md?raw'
import tokenScale from '../builtin/design-system/references/token-scale.md?raw'
import designSystem from '../builtin/design-system/SKILL.md?raw'
import landingPage from '../builtin/landing-page/SKILL.md?raw'
import layout from '../builtin/layout/SKILL.md?raw'
import mobileApp from '../builtin/mobile-app/SKILL.md?raw'
import restyle from '../builtin/restyle/SKILL.md?raw'
import slides from '../builtin/slides/SKILL.md?raw'
import tailwindV4 from '../builtin/tailwind-v4/SKILL.md?raw'
import webApp from '../builtin/web-app/SKILL.md?raw'
import { isSkill, skillFromFolder } from '../folder'
import type { Skill, SkillScan } from '../types'

/** A skill that ships with the app: its SKILL.md and the other files it links, by path. */
interface BuiltinSkillFolder {
  skillFile: string
  files: Readonly<Record<string, string>>
}

/**
 * The skills that ship with the app, by folder name, in the order they are offered: guides to
 * kinds of design first, then skills that work on an existing design. Embedded at build time,
 * so they read the same in the browser and on the desktop.
 */
const BUILTIN_SKILL_FOLDERS = {
  'landing-page': { skillFile: landingPage, files: {} },
  'mobile-app': { skillFile: mobileApp, files: {} },
  'web-app': { skillFile: webApp, files: {} },
  dashboard: { skillFile: dashboard, files: {} },
  slides: { skillFile: slides, files: {} },
  'design-system': {
    skillFile: designSystem,
    files: { 'references/token-scale.md': tokenScale }
  },
  'tailwind-v4': { skillFile: tailwindV4, files: {} },
  layout: { skillFile: layout, files: {} },
  restyle: { skillFile: restyle, files: {} },
  'dark-mode': { skillFile: darkMode, files: {} },
  'design-review': { skillFile: designReview, files: {} }
} as const satisfies Record<string, BuiltinSkillFolder>

export type BuiltinSkillName = keyof typeof BUILTIN_SKILL_FOLDERS

function isBuiltinSkillName(name: string): name is BuiltinSkillName {
  return Object.hasOwn(BUILTIN_SKILL_FOLDERS, name)
}

/** The built-in skill this is; null for a user's skill, even one that took a built-in name. */
export function builtinSkillName(skill: Pick<Skill, 'source' | 'name'>): BuiltinSkillName | null {
  return skill.source === 'builtin' && isBuiltinSkillName(skill.name) ? skill.name : null
}

function builtinSkillFolder(name: string, folder: BuiltinSkillFolder) {
  const files: Readonly<Record<string, string>> = folder.files
  return skillFromFolder({
    source: 'builtin',
    folder: name,
    location: name,
    skillFile: folder.skillFile,
    files: Object.keys(files),
    readFile: async (path) => {
      if (!Object.hasOwn(files, path)) throw new Error(`"${path}" is not in the skill.`)
      return files[path] ?? ''
    }
  })
}

let scan: SkillScan | null = null

/** The skills that ship with the app, read once; they cannot change while it runs. */
export function readBuiltinSkills(): SkillScan {
  if (scan) return scan
  const [skills, problems] = partition(
    Object.entries(BUILTIN_SKILL_FOLDERS).map(([name, folder]) => builtinSkillFolder(name, folder)),
    isSkill
  )
  scan = { skills, problems }
  return scan
}
