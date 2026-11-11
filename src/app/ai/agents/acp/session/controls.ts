import type {
  SessionConfigOption,
  SessionConfigSelectGroup,
  SessionConfigSelectOption,
  SessionModeState,
  SessionModelState
} from '@agentclientprotocol/sdk'

/**
 * How an agent lets a session change: a session config option (`session/set_config_option`),
 * or the older session modes (`session/set_mode`) and models (`session/set_model`).
 */
type AgentSessionControlKind = 'config' | 'mode' | 'model'

/** What a control sets, for its label and place in the composer; unknown categories are `other`. */
export type AgentSessionControlCategory = 'model' | 'thought_level' | 'mode' | 'other'

export const AGENT_SESSION_CONTROL_CATEGORIES = [
  'model',
  'thought_level',
  'mode',
  'other'
] as const satisfies readonly AgentSessionControlCategory[]

interface AgentSessionChoice {
  value: string
  name: string
  description: string | null
}

interface AgentSessionChoiceGroup {
  /** The heading the agent gave the group; null for an agent's flat list. */
  label: string | null
  choices: AgentSessionChoice[]
}

/** One thing a person may choose for an agent's session, as the agent advertised it. */
export interface AgentSessionControl {
  id: string
  kind: AgentSessionControlKind
  category: AgentSessionControlCategory
  name: string
  description: string | null
  value: string
  /** The value the agent's last session started with: the agent's own default. */
  initial: string
  groups: AgentSessionChoiceGroup[]
}

/** What `session/new` answers with that the composer offers. */
export interface AgentSessionAdvertisement {
  configOptions?: SessionConfigOption[] | null
  modes?: SessionModeState | null
  models?: SessionModelState | null
}

/** The ids the older modes and models take, which no config option shares with them. */
export const LEGACY_MODE_CONTROL = '_session-mode'
export const LEGACY_MODEL_CONTROL = '_session-model'

function category(value: string | null | undefined): AgentSessionControlCategory {
  return value === 'model' || value === 'thought_level' || value === 'mode' ? value : 'other'
}

function choice(option: SessionConfigSelectOption): AgentSessionChoice {
  return { value: option.value, name: option.name, description: option.description ?? null }
}

function isGroup(
  option: SessionConfigSelectOption | SessionConfigSelectGroup
): option is SessionConfigSelectGroup {
  return 'group' in option
}

function configControl(option: SessionConfigOption): AgentSessionControl {
  const flat: AgentSessionChoice[] = []
  const groups: AgentSessionChoiceGroup[] = []
  for (const entry of option.options) {
    if (isGroup(entry)) groups.push({ label: entry.name, choices: entry.options.map(choice) })
    else flat.push(choice(entry))
  }
  return {
    id: option.id,
    kind: 'config',
    category: category(option.category),
    name: option.name,
    description: option.description ?? null,
    value: option.currentValue,
    initial: option.currentValue,
    groups: flat.length ? [{ label: null, choices: flat }, ...groups] : groups
  }
}

function modeControl(modes: SessionModeState): AgentSessionControl {
  return {
    id: LEGACY_MODE_CONTROL,
    kind: 'mode',
    category: 'mode',
    name: 'Mode',
    description: null,
    value: modes.currentModeId,
    initial: modes.currentModeId,
    groups: [
      {
        label: null,
        choices: modes.availableModes.map((mode) => ({
          value: mode.id,
          name: mode.name,
          description: mode.description ?? null
        }))
      }
    ]
  }
}

function modelControl(models: SessionModelState): AgentSessionControl {
  return {
    id: LEGACY_MODEL_CONTROL,
    kind: 'model',
    category: 'model',
    name: 'Model',
    description: null,
    value: models.currentModelId,
    initial: models.currentModelId,
    groups: [
      {
        label: null,
        choices: models.availableModels.map((model) => ({
          value: model.modelId,
          name: model.name,
          description: model.description ?? null
        }))
      }
    ]
  }
}

function byCategory(controls: AgentSessionControl[]): AgentSessionControl[] {
  const rank = (control: AgentSessionControl) =>
    AGENT_SESSION_CONTROL_CATEGORIES.indexOf(control.category)
  return controls.toSorted((a, b) => rank(a) - rank(b))
}

/** Whether a control offers anything to choose between. */
function offersChoice(control: AgentSessionControl): boolean {
  return control.groups.reduce((count, group) => count + group.choices.length, 0) > 1
}

/**
 * The controls an agent advertised. Config options come first, as ACP asks clients to prefer
 * them; the older modes and models fill in only a category no config option covers.
 */
export function sessionControls(advertised: AgentSessionAdvertisement): AgentSessionControl[] {
  const configs = (advertised.configOptions ?? []).map(configControl)
  const covered = new Set(configs.map((control) => control.category))
  const legacy: AgentSessionControl[] = []
  if (advertised.models && !covered.has('model')) legacy.push(modelControl(advertised.models))
  if (advertised.modes && !covered.has('mode')) legacy.push(modeControl(advertised.modes))
  return byCategory([...configs, ...legacy].filter(offersChoice))
}

/**
 * The controls after the agent announced its full set of config options again, as it does when
 * one option changes others; older modes and models stay where no config option replaced them.
 */
export function withConfigOptions(
  controls: readonly AgentSessionControl[],
  configOptions: readonly SessionConfigOption[]
): AgentSessionControl[] {
  const before = new Map(controls.map((control) => [control.id, control.initial]))
  const configs = configOptions.map((option) => {
    const control = configControl(option)
    return { ...control, initial: before.get(control.id) ?? control.initial }
  })
  const covered = new Set(configs.map((control) => control.category))
  const legacy = controls.filter(
    (control) => control.kind !== 'config' && !covered.has(control.category)
  )
  return byCategory([...configs, ...legacy].filter(offersChoice))
}

/** The controls with one set to a value, as after the agent accepted it. */
export function withControlValue(
  controls: readonly AgentSessionControl[],
  id: string,
  value: string
): AgentSessionControl[] {
  return controls.map((control) => (control.id === id ? { ...control, value } : control))
}

/** The controls after the agent switched its session mode on its own. */
export function withCurrentMode(
  controls: readonly AgentSessionControl[],
  modeId: string
): AgentSessionControl[] {
  return controls.map((control) =>
    control.kind === 'mode' && hasChoice(control, modeId) ? { ...control, value: modeId } : control
  )
}

/**
 * Choices that let the agent act without asking: Claude Code's bypass and don't-ask modes,
 * Codex's full access, Gemini CLI's YOLO. ACP does not mark them, so they are known by name.
 */
const PERMISSION_SKIPPING_CHOICE =
  /bypass|yolo|full[\s_-]*access|don['’]?t[\s_-]*ask|never[\s_-]*ask|skip[\s_-]*permission|no[\s_-]*approval/i

/**
 * Whether a choice lets the agent change files or run commands without a permission request,
 * which is never carried over to another session.
 */
export function skipsPermissionRequests(control: AgentSessionControl, value: string): boolean {
  if (control.category === 'model' || control.category === 'thought_level') return false
  // Only the id and name: a safe mode's description may well mention what it guards against.
  const name = choiceName(control, value)
  return PERMISSION_SKIPPING_CHOICE.test(value) || PERMISSION_SKIPPING_CHOICE.test(name)
}

/**
 * Whether a saved choice applies to every new session. In a person's project folder only the
 * model and reasoning effort do: the mode and other settings start at the agent's defaults, so
 * a mode that edits without asking, chosen elsewhere, never reaches their files.
 */
export function carriesOver(
  control: AgentSessionControl,
  value: string,
  { projectFolder = false }: { projectFolder?: boolean } = {}
): boolean {
  if (skipsPermissionRequests(control, value)) return false
  return !projectFolder || control.category === 'model' || control.category === 'thought_level'
}

export function hasChoice(control: AgentSessionControl, value: string): boolean {
  return control.groups.some((group) => group.choices.some((entry) => entry.value === value))
}

export function choiceName(control: AgentSessionControl, value: string): string {
  for (const group of control.groups) {
    const found = group.choices.find((entry) => entry.value === value)
    if (found) return found.name
  }
  return value
}

/** The model the session uses, as the agent names it, for usage counts. */
export function sessionModel(controls: readonly AgentSessionControl[]): string | null {
  return controls.find((control) => control.category === 'model')?.value ?? null
}
