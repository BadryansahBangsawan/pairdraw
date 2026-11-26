import * as v from 'valibot'

import { isVertexProject } from '@/app/ai/providers/vertex/endpoint'
import {
  requiredSetting,
  requiredSettingsURL,
  type SettingsValidationMessages
} from '@/app/settings/validation/schema'

export interface ModelProfileValidationContext {
  customModel: boolean
  /** `cloud` is Cloud's AI service, which needs a workspace instead of a key. */
  providerKind: 'api' | 'acp' | 'harness' | 'cloud'
  supportsCustomBaseURL: boolean
  design: boolean
  intent: 'save' | 'test'
  /** Set for a Vertex AI model; Claude there needs a project and an access token. */
  vertex?: { claude: boolean }
}

export interface ModelProfileValidationMessages extends SettingsValidationMessages {
  designToolsRequired: string
  vertexProjectRequired: string
  vertexProjectInvalid: string
  vertexClaudeAccessToken: string
}

/** The project typed for a Vertex AI model; Claude cannot fall back to express mode. */
function vertexProjectSchema(claude: boolean, messages: ModelProfileValidationMessages) {
  return v.pipe(
    v.string(),
    v.trim(),
    v.check((project) => !claude || project.length > 0, messages.vertexProjectRequired),
    v.check((project) => !project || isVertexProject(project), messages.vertexProjectInvalid)
  )
}

export function modelProfileSchema(
  context: ModelProfileValidationContext,
  messages: ModelProfileValidationMessages
) {
  const modelField = context.customModel ? 'customModelID' : 'modelID'
  // Agents choose their own model, and Pi falls back to the default model set in Pi.
  const requiresAPI = context.providerKind === 'api'
  const requiresModel = requiresAPI || context.providerKind === 'cloud'
  return v.pipe(
    v.object({
      // The design model is unnamed until one is set, and its label follows the interface
      // language, so saving it does not require a name of its own.
      name:
        context.intent === 'save' && !context.design
          ? requiredSetting(messages.requiredField)
          : v.string(),
      modelID:
        requiresModel && !context.customModel
          ? requiredSetting(messages.requiredField)
          : v.string(),
      customModelID:
        requiresModel && context.customModel ? requiredSetting(messages.requiredField) : v.string(),
      baseURL:
        requiresAPI && context.supportsCustomBaseURL ? requiredSettingsURL(messages) : v.string(),
      credential:
        requiresAPI && context.intent === 'test'
          ? v.pipe(
              v.boolean(),
              v.check((value: boolean) => value, messages.requiredField)
            )
          : v.boolean(),
      cloudWorkspace:
        context.providerKind === 'cloud'
          ? requiredSetting(messages.requiredField)
          : v.optional(v.string()),
      vertexProject: context.vertex
        ? vertexProjectSchema(context.vertex.claude, messages)
        : v.optional(v.string()),
      // An API key reaches Gemini only, so Claude would fail to sign in at chat time.
      vertexCredentialKind: context.vertex?.claude
        ? v.pipe(
            v.string(),
            v.check((kind: string) => kind !== 'api-key', messages.vertexClaudeAccessToken)
          )
        : v.optional(v.string()),
      tools: v.boolean()
    }),
    v.forward(
      v.partialCheck(
        [['tools']],
        ({ tools }) => context.intent !== 'save' || !context.design || tools,
        messages.designToolsRequired
      ),
      [modelField]
    )
  )
}
