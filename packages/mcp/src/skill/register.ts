import type { McpServer, PromptMessage } from '@modelcontextprotocol/server'
// eslint-disable-next-line open-pencil/no-mixed-case-acronym-identifiers -- Upstream export spelling.
import { toStandardJsonSchema as toStandardJSONSchema } from '@valibot/to-json-schema'
import * as v from 'valibot'

import {
  SKILL_FILE_PATHS,
  SKILL_FILES,
  SKILL_NAME,
  skillResourceURI,
  type SkillFile
} from '#mcp/skill/content'

const SKILL_MIME_TYPE = 'text/markdown'

/** The prompt that loads the skill into a conversation, as a slash command in most clients. */
export const SKILL_PROMPT_NAME = 'design'

const skillPromptArgsSchema = v.object({
  task: v.optional(
    v.pipe(v.string(), v.description('What to design or change, such as "a pricing page"'))
  )
})

function fileMessage(file: SkillFile): PromptMessage {
  return {
    role: 'user',
    content: { type: 'text', text: `<!-- ${SKILL_NAME}/${file.path} -->\n\n${file.text}` }
  }
}

function taskMessage(task: string | undefined): PromptMessage {
  const request = task?.trim()
  return {
    role: 'user',
    content: {
      type: 'text',
      text: request
        ? `Follow the OpenPencil skill above and use the open-pencil tools for this task: ${request}`
        : 'Follow the OpenPencil skill above whenever you use the open-pencil tools in this conversation.'
    }
  }
}

/**
 * Serves the agent skill to clients that cannot install skills: each file as a resource, and all
 * of them as the `design` prompt. These carry no document data, so tool policy and selection
 * scope leave them on; `read_skill` is the tool form for clients without resources or prompts.
 */
export function registerSkill(mcpServer: McpServer): void {
  for (const path of SKILL_FILE_PATHS) {
    const file = SKILL_FILES[path]
    mcpServer.registerResource(
      `${SKILL_NAME}/${path}`,
      skillResourceURI(path),
      { title: file.title, description: file.description, mimeType: SKILL_MIME_TYPE },
      (uri) => ({ contents: [{ uri: uri.href, mimeType: SKILL_MIME_TYPE, text: file.text }] })
    )
  }

  mcpServer.registerPrompt(
    SKILL_PROMPT_NAME,
    {
      title: 'Design with OpenPencil',
      description:
        'Load the OpenPencil skill and design authoring reference, optionally with a design task.',
      argsSchema: toStandardJSONSchema(skillPromptArgsSchema)
    },
    ({ task }) => ({
      description: SKILL_FILES['SKILL.md'].description,
      messages: [
        ...SKILL_FILE_PATHS.map((path) => fileMessage(SKILL_FILES[path])),
        taskMessage(task)
      ]
    })
  )
}
