import type {
  ClientSideConnection,
  SessionConfigOption,
  SessionUpdate
} from '@agentclientprotocol/sdk'
import { useLocalStorage } from '@vueuse/core'
import { omit } from 'es-toolkit'
import * as v from 'valibot'
import { computed } from 'vue'

import {
  AGENT_SESSION_CONTROL_CATEGORIES,
  carriesOver,
  choiceName,
  hasChoice,
  sessionControls,
  withConfigOptions,
  withControlValue,
  withCurrentMode,
  type AgentSessionAdvertisement,
  type AgentSessionControl
} from './controls'

const MAX_TEXT = 512
const MAX_DESCRIPTION = 4 * MAX_TEXT
const MAX_ENTRIES = 256
const MAX_CONTROLS = 32

const textSchema = v.pipe(v.string(), v.maxLength(MAX_TEXT))
const descriptionSchema = v.nullable(v.pipe(v.string(), v.maxLength(MAX_DESCRIPTION)))
const controlSchema = v.object({
  id: textSchema,
  kind: v.picklist(['config', 'mode', 'model']),
  category: v.picklist(AGENT_SESSION_CONTROL_CATEGORIES),
  name: textSchema,
  description: descriptionSchema,
  value: textSchema,
  initial: textSchema,
  groups: v.pipe(
    v.array(
      v.object({
        label: v.nullable(textSchema),
        choices: v.pipe(
          v.array(
            v.object({
              value: textSchema,
              name: textSchema,
              description: descriptionSchema
            })
          ),
          v.maxLength(MAX_ENTRIES)
        )
      })
    ),
    v.maxLength(MAX_ENTRIES)
  )
})
// Each agent's entry is checked on its own, so one that no longer reads drops only itself.
const catalogSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.record(v.string(), v.fallback(v.pipe(v.array(controlSchema), v.maxLength(MAX_CONTROLS)), []))
)
const choicesSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.record(v.string(), v.fallback(v.record(textSchema, textSchema), {}))
)

function clip(text: string, max = MAX_TEXT): string {
  return text.length > max ? text.slice(0, max) : text
}

function clipDescription(text: string | null): string | null {
  return text === null ? null : clip(text, MAX_DESCRIPTION)
}

/**
 * The controls cut to what the catalog keeps, so whatever an agent advertises reads back:
 * names are shortened, and a control or choice whose id is too long to match is left out.
 */
function storable(controls: readonly AgentSessionControl[]): AgentSessionControl[] {
  const fits = (text: string) => text.length <= MAX_TEXT
  return controls
    .filter((control) => fits(control.id) && fits(control.value) && fits(control.initial))
    .slice(0, MAX_CONTROLS)
    .map((control) => ({
      ...control,
      name: clip(control.name),
      description: clipDescription(control.description),
      groups: control.groups.slice(0, MAX_ENTRIES).map((group) => ({
        label: group.label === null ? null : clip(group.label),
        choices: group.choices
          .filter((choice) => fits(choice.value))
          .slice(0, MAX_ENTRIES)
          .map((choice) => ({
            value: choice.value,
            name: clip(choice.name),
            description: clipDescription(choice.description)
          }))
      }))
    }))
}

/**
 * The controls each agent advertised in its last session, by agent id, kept so the composer
 * offers them before the next session starts.
 */
const catalog = useLocalStorage<Record<string, AgentSessionControl[]>>(
  'pairdraw:ai:agent-session-controls',
  {},
  {
    serializer: {
      read: (raw) => {
        const parsed = v.safeParse(catalogSchema, raw)
        return parsed.success ? parsed.output : {}
      },
      write: JSON.stringify
    }
  }
)

/** What the person chose for each agent, by agent id and control id; every session starts so. */
const choices = useLocalStorage<Record<string, Record<string, string>>>(
  'pairdraw:ai:agent-session-choices',
  {},
  {
    serializer: {
      read: (raw) => {
        const parsed = v.safeParse(choicesSchema, raw)
        return parsed.success ? parsed.output : {}
      },
      write: JSON.stringify
    }
  }
)

/** Sets one control in a running session; config options answer with the full set again. */
export type SessionControlSetter = (
  control: AgentSessionControl,
  value: string
) => Promise<SessionConfigOption[] | null>

interface LiveSession {
  set: SessionControlSetter
  onChange: (controls: readonly AgentSessionControl[]) => void
}

/** The running session of each agent, which a choice applies to at once. */
const live = new Map<string, LiveSession>()

function setCatalog(agentId: string, controls: AgentSessionControl[]): void {
  const kept = storable(controls)
  catalog.value = { ...catalog.value, [agentId]: kept }
  live.get(agentId)?.onChange(kept)
}

function setChoice(agentId: string, controlId: string, value: string | null): void {
  const rest = omit(choices.value[agentId] ?? {}, [controlId])
  choices.value = {
    ...choices.value,
    [agentId]: value === null ? rest : { ...rest, [controlId]: value }
  }
}

export interface AgentSessionOptions {
  /** Whether the session works in a project folder the person chose for the chat. */
  projectFolder?: boolean
}

/**
 * What the composer shows for an agent: a running session's controls as they are, or what the
 * next session starts with, the agent's defaults with the saved choices that carry over to it.
 */
export function agentSessionControls(
  agentId: string,
  options: AgentSessionOptions = {}
): AgentSessionControl[] {
  const controls = catalog.value[agentId] ?? []
  if (live.has(agentId)) return controls
  const saved = choices.value[agentId] ?? {}
  return controls.map((control) => {
    const chosen = Object.hasOwn(saved, control.id) ? saved[control.id] : null
    const applies =
      chosen !== null && hasChoice(control, chosen) && carriesOver(control, chosen, options)
    return { ...control, value: applies ? chosen : control.initial }
  })
}

/** A reactive view of one agent's controls, for the composer. */
export function useAgentSessionControls(
  agentId: () => string | null,
  options: () => AgentSessionOptions = () => ({})
) {
  return computed(() => {
    const id = agentId()
    return id ? agentSessionControls(id, options()) : []
  })
}

/**
 * The name of the mode a session in a project folder starts in, the agent's own default, or
 * null before the agent has named its modes.
 */
export function projectFolderStartMode(agentId: string): string | null {
  const mode = (catalog.value[agentId] ?? []).find((control) => control.category === 'mode')
  return mode ? choiceName(mode, mode.initial) : null
}

/**
 * Records a choice. A running session switches at once and the agent's answer becomes what the
 * composer shows; a choice the agent refuses is not kept, and the error reaches the caller.
 * A choice that lets the agent act without asking applies to the running session only.
 */
export async function chooseAgentSessionControl(
  agentId: string,
  controlId: string,
  value: string
): Promise<void> {
  const control = (catalog.value[agentId] ?? []).find((entry) => entry.id === controlId)
  if (!control || !hasChoice(control, value)) return
  const previous = choices.value[agentId]?.[controlId] ?? null
  setChoice(agentId, controlId, carriesOver(control, value) ? value : null)
  const session = live.get(agentId)
  if (!session) return
  try {
    const configOptions = await session.set(control, value)
    const current = catalog.value[agentId] ?? []
    setCatalog(
      agentId,
      configOptions
        ? withConfigOptions(current, configOptions)
        : withControlValue(current, controlId, value)
    )
  } catch (error) {
    setChoice(agentId, controlId, previous)
    throw error
  }
}

/**
 * Takes a new session's controls: saved choices the agent still offers are applied one by one,
 * since a config option may change others, and a choice it no longer offers, or one that lets
 * it act without asking, is forgotten. In a project folder only the model and reasoning effort
 * carry over. A choice the agent refuses leaves the session as it started. Returns the function
 * that ends the session's link to the composer.
 */
export async function startAgentSessionControls(
  agentId: string,
  advertised: AgentSessionAdvertisement,
  set: SessionControlSetter,
  onChange: LiveSession['onChange'] = () => undefined,
  options: AgentSessionOptions = {}
): Promise<() => void> {
  let controls = sessionControls(advertised)
  const saved = choices.value[agentId] ?? {}
  for (const [controlId, value] of Object.entries(saved)) {
    const control = controls.find((entry) => entry.id === controlId)
    if (!control) continue
    if (!hasChoice(control, value) || !carriesOver(control, value)) {
      setChoice(agentId, controlId, null)
      continue
    }
    if (!carriesOver(control, value, options) || control.value === value) continue
    try {
      const configOptions = await set(control, value)
      controls = configOptions
        ? withConfigOptions(controls, configOptions)
        : withControlValue(controls, controlId, value)
    } catch (error) {
      console.warn(`Could not apply the saved ${control.category} to ${agentId}`, error)
    }
  }
  const session: LiveSession = { set, onChange }
  live.set(agentId, session)
  setCatalog(agentId, controls)
  return () => {
    if (live.get(agentId) === session) live.delete(agentId)
  }
}

/** Follows what the agent changes on its own: its config options and its session mode. */
export function noteAgentSessionUpdate(agentId: string, update: SessionUpdate): void {
  if (update.sessionUpdate === 'config_option_update') {
    setCatalog(agentId, withConfigOptions(catalog.value[agentId] ?? [], update.configOptions))
  } else if (update.sessionUpdate === 'current_mode_update') {
    setCatalog(agentId, withCurrentMode(catalog.value[agentId] ?? [], update.currentModeId))
  }
}

type SessionControlConnection = Pick<
  ClientSideConnection,
  'setSessionConfigOption' | 'setSessionMode' | 'unstable_setSessionModel'
>

/** Sets a control through the ACP request the agent advertised it with. */
export function sessionControlSetter(
  connection: SessionControlConnection,
  sessionId: string
): SessionControlSetter {
  return async (control, value) => {
    if (control.kind === 'config') {
      const result = await connection.setSessionConfigOption({
        sessionId,
        configId: control.id,
        value
      })
      return result.configOptions
    }
    if (control.kind === 'mode') await connection.setSessionMode({ sessionId, modeId: value })
    else await connection.unstable_setSessionModel({ sessionId, modelId: value })
    return null
  }
}
