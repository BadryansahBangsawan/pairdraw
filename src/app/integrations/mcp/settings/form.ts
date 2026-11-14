import { omit } from 'es-toolkit'
import * as v from 'valibot'
import { useForm } from 'vee-validate'
import { computed, reactive, ref, watch, type Ref } from 'vue'

import {
  createMCPConnectionDraft,
  isValidMCPCommand,
  validateMCPConnectionURL,
  mcpConnectionSettings,
  MCP_CONNECTION_NAME_MAX_LENGTH
} from '@/app/integrations/mcp'
import { requiredSetting, type SettingsValidationMessages } from '@/app/settings/validation/schema'
import { validateAfterFirstError } from '@/app/settings/validation/use'

import { parseMCPArguments } from '../stdio/env'
import type { MCPConnectionDraft } from '../types'

interface ConnectionFormMessages {
  connectionNameInvalid: string
  serverURLHint: string
  bearerTokenRequired: string
  commandRequired: string
  environmentInvalid: string
}
export type MCPConnectionField = 'name' | 'url' | 'command' | 'credential' | 'environment'
export type MCPConnectionFieldErrors = Partial<Record<MCPConnectionField, string>>

function validURL(value: string): boolean {
  try {
    validateMCPConnectionURL(value.trim())
    return true
  } catch {
    return false
  }
}

/**
 * Only credential availability and validity enter form state, never entered or saved secrets:
 * `credential` says a bearer token is typed or saved, `environment` that the typed variables
 * parse.
 */
export function useMCPConnectionForm(
  messages: Readonly<Ref<SettingsValidationMessages>>,
  automation: Readonly<Ref<ConnectionFormMessages>>
) {
  const id = ref<MCPConnectionDraft['id']>(null)
  const schema = computed(() =>
    v.pipe(
      v.object({
        name: v.pipe(
          requiredSetting(messages.value.requiredField),
          v.check(
            (name) =>
              name.length <= MCP_CONNECTION_NAME_MAX_LENGTH &&
              name.toLowerCase() !== 'pairdraw' &&
              !mcpConnectionSettings.value.connections.some(
                (connection) =>
                  connection.id !== id.value && connection.name.toLowerCase() === name.toLowerCase()
              ),
            automation.value.connectionNameInvalid
          )
        ),
        transportType: v.picklist(['streamable-http', 'stdio']),
        url: v.string(),
        command: v.string(),
        args: v.string(),
        enabled: v.boolean(),
        authenticationType: v.picklist(['none', 'bearer', 'oauth']),
        credential: v.boolean(),
        environment: v.boolean()
      }),
      v.forward(
        v.partialCheck(
          [['transportType'], ['url']],
          (value) => value.transportType !== 'streamable-http' || validURL(value.url),
          automation.value.serverURLHint
        ),
        ['url']
      ),
      v.forward(
        v.partialCheck(
          [['transportType'], ['command'], ['args']],
          (value) =>
            value.transportType !== 'stdio' ||
            isValidMCPCommand(value.command, parseMCPArguments(value.args)),
          automation.value.commandRequired
        ),
        ['command']
      ),
      v.forward(
        v.partialCheck(
          [['transportType'], ['environment']],
          (value) => value.transportType !== 'stdio' || value.environment,
          automation.value.environmentInvalid
        ),
        ['environment']
      ),
      v.forward(
        v.partialCheck(
          [['enabled'], ['transportType'], ['authenticationType'], ['credential']],
          (value) =>
            !value.enabled ||
            value.transportType !== 'streamable-http' ||
            value.authenticationType !== 'bearer' ||
            value.credential,
          automation.value.bearerTokenRequired
        ),
        ['credential']
      )
    )
  )
  const initialValues = (draft: MCPConnectionDraft) => ({
    ...omit(draft, ['id']),
    credential: false,
    environment: true
  })
  const form = useForm({
    initialValues: initialValues(createMCPConnectionDraft()),
    validationSchema: schema
  })
  const config = validateAfterFirstError
  const [name] = form.defineField('name', config)
  const [transportType] = form.defineField('transportType', config)
  const [url] = form.defineField('url', config)
  const [command] = form.defineField('command', config)
  const [args] = form.defineField('args', config)
  const [enabled] = form.defineField('enabled', config)
  const [authenticationType] = form.defineField('authenticationType', config)
  form.defineField('credential', config)
  form.defineField('environment', config)
  watch([enabled, authenticationType, transportType], () => {
    if (form.errors.value.credential) void form.validateField('credential')
  })
  const fields = reactive({
    id,
    name,
    enabled,
    transportType,
    url,
    command,
    args,
    authenticationType
  })
  const draft = computed<MCPConnectionDraft>({
    get: () => fields,
    set: (values) => {
      id.value = values.id
      form.resetForm({ values: initialValues(values) })
    }
  })

  return {
    draft,
    dirty: computed(() => form.meta.value.dirty),
    errors: form.errors,
    blur: (field: MCPConnectionField) => form.validateField(field),
    setCredentialReady: (ready: boolean) => form.resetField('credential', { value: ready }),
    setEnvironmentValid: (valid: boolean) => form.resetField('environment', { value: valid }),
    handleSubmit: form.handleSubmit,
    isSubmitting: form.isSubmitting
  }
}
