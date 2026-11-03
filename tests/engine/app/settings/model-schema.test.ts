import { expect, test } from 'bun:test'

import * as v from 'valibot'

import {
  modelProfileSchema,
  type ModelProfileValidationContext
} from '@/app/ai/models/settings/profile-editor/schema'

const messages = {
  requiredField: 'Required',
  invalidURL: 'Invalid URL',
  designToolsRequired: 'Tools required',
  vertexProjectRequired: 'Project required',
  vertexProjectInvalid: 'Invalid project',
  vertexClaudeAccessToken: 'Access token required'
}
const context: ModelProfileValidationContext = {
  customModel: false,
  providerKind: 'api',
  supportsCustomBaseURL: false,
  design: true,
  intent: 'save'
}
const values = {
  name: 'Design',
  modelID: 'known-model',
  customModelID: '',
  baseURL: '',
  credential: false,
  cloudWorkspace: '',
  tools: true
}

function errors(
  options: Partial<ModelProfileValidationContext>,
  input: Record<string, unknown> = values
) {
  const result = v.safeParse(modelProfileSchema({ ...context, ...options }, messages), input)
  return result.success ? {} : v.flatten(result.issues).nested
}

test('model requirements attach to the active field without fallback to an inactive model ID', () => {
  expect(errors({}, { ...values, modelID: '' })).toEqual({ modelID: ['Required'] })
  expect(errors({ customModel: true })).toEqual({ customModelID: ['Required'] })
  expect(
    errors({ customModel: true }, { ...values, modelID: '', customModelID: 'custom' })
  ).toEqual({})
})

test('tool support errors are forwarded by the schema to the active model field', () => {
  expect(errors({}, { ...values, tools: false })).toEqual({ modelID: ['Tools required'] })
  expect(
    errors({ customModel: true }, { ...values, customModelID: 'custom', tools: false })
  ).toEqual({ customModelID: ['Tools required'] })
  expect(errors({ design: false }, { ...values, tools: false })).toEqual({})
})

test('independent field errors survive a failed tool-support rule', () => {
  expect(errors({}, { ...values, name: '', tools: false })).toEqual({
    name: ['Required'],
    modelID: ['Tools required']
  })
})

test('Pi may leave the model empty to use the default model set in Pi', () => {
  expect(errors({ providerKind: 'harness' }, { ...values, modelID: '' })).toEqual({})
  expect(errors({ providerKind: 'harness', intent: 'test' }, { ...values, modelID: '' })).toEqual(
    {}
  )
})

test('OpenPencil Cloud needs a workspace and a model, but no key', () => {
  const cloud = { providerKind: 'cloud' as const, intent: 'test' as const }
  expect(errors(cloud, { ...values, modelID: '', cloudWorkspace: '' })).toEqual({
    modelID: ['Required'],
    cloudWorkspace: ['Required']
  })
  expect(errors(cloud, { ...values, cloudWorkspace: 'workspace' })).toEqual({})
})

test('Claude on Vertex AI refuses to save or test without a valid project or with an API key', () => {
  const claude = { vertex: { claude: true } }
  const vertex = { ...values, vertexProject: '', vertexCredentialKind: 'access-token' }
  for (const intent of ['save', 'test'] as const) {
    expect(errors({ ...claude, intent }, { ...vertex, credential: true })).toEqual({
      vertexProject: ['Project required']
    })
  }
  expect(errors(claude, { ...vertex, vertexProject: 'My-Project' })).toEqual({
    vertexProject: ['Invalid project']
  })
  expect(
    errors(claude, { ...vertex, vertexProject: 'design-team', vertexCredentialKind: 'api-key' })
  ).toEqual({ vertexCredentialKind: ['Access token required'] })
  expect(errors(claude, { ...vertex, vertexProject: 'design-team' })).toEqual({})
})

test('Gemini on Vertex AI may use express mode with an API key, but not a mistyped project', () => {
  const gemini = { vertex: { claude: false } }
  const vertex = { ...values, vertexProject: '', vertexCredentialKind: 'api-key' }
  expect(errors(gemini, vertex)).toEqual({})
  expect(errors(gemini, { ...vertex, vertexProject: 'my project' })).toEqual({
    vertexProject: ['Invalid project']
  })
})
