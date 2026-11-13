import designAuthoring from '#skills/open-pencil/references/design-authoring.md?raw'
// The installable skill in `skills/open-pencil`, embedded at build time so the published server
// serves the copy it shipped with and never reads the repository at runtime.
import skill from '#skills/open-pencil/SKILL.md?raw'

/** The skill's name, as its frontmatter and `npx skills add` know it. */
export const SKILL_NAME = 'open-pencil'

/** Every file of the skill, by its path inside the skill folder, as `SKILL.md` links them. */
export const SKILL_FILE_PATHS = ['SKILL.md', 'references/design-authoring.md'] as const
export type SkillFilePath = (typeof SKILL_FILE_PATHS)[number]

export interface SkillFile {
  path: SkillFilePath
  title: string
  description: string
  text: string
}

export const SKILL_FILES: Readonly<Record<SkillFilePath, SkillFile>> = {
  'SKILL.md': {
    path: 'SKILL.md',
    title: 'Pairdraw agent skill',
    description:
      'How to inspect, edit, and export designs in the running Pairdraw editor with these tools, the CLI, JSX, and eval. Read it first.',
    text: skill
  },
  'references/design-authoring.md': {
    path: 'references/design-authoring.md',
    title: 'Pairdraw design authoring reference',
    description:
      'The JSX the render tool accepts: layout, paint, text, variables, components, and controls, with tested examples. Read it before creating or changing designs.',
    text: designAuthoring
  }
}

/** Where a skill file is served as an MCP resource. */
export function skillResourceURI(path: SkillFilePath): string {
  return `openpencil://skills/${SKILL_NAME}/${path}`
}
