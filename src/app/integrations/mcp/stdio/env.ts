import { compact } from 'es-toolkit'

/** Names a shell accepts for an exported variable. */
const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/
const MAX_ENV_VARIABLES = 32
const MAX_ENV_VALUE_LENGTH = 4096

/**
 * Variables that choose which program runs or load code into it. The desktop shell refuses
 * them too (`desktop/src/agents/mcp_stdio.rs`), since the person approves a command line once
 * and its variables' values may change afterwards.
 */
const BLOCKED_ENV_NAMES = new Set([
  'PATH',
  'PATHEXT',
  'COMSPEC',
  'NODE_OPTIONS',
  'NODE_PATH',
  'LD_PRELOAD',
  'LD_LIBRARY_PATH',
  'LD_AUDIT',
  'PYTHONSTARTUP',
  'PYTHONPATH',
  'PYTHONHOME',
  'BASH_ENV',
  'ENV',
  'PERL5OPT',
  'PERL5LIB',
  'RUBYOPT',
  'RUBYLIB',
  'JAVA_TOOL_OPTIONS',
  '_JAVA_OPTIONS'
])

export function isAllowedMCPEnvName(name: string): boolean {
  const upper = name.toUpperCase()
  return ENV_NAME_PATTERN.test(name) && !BLOCKED_ENV_NAMES.has(upper) && !upper.startsWith('DYLD_')
}

export type MCPEnvironment = Record<string, string>

/**
 * Reads `NAME=value` lines; blank lines and `#` comments are skipped. Returns null when a line
 * is malformed, a name repeats or is not allowed, or there are too many variables.
 */
export function parseMCPEnvironment(text: string): MCPEnvironment | null {
  const env: MCPEnvironment = {}
  let count = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator <= 0) return null
    const name = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (!isAllowedMCPEnvName(name) || Object.hasOwn(env, name)) return null
    if (value.length > MAX_ENV_VALUE_LENGTH) return null
    env[name] = value
    count++
    if (count > MAX_ENV_VARIABLES) return null
  }
  return env
}

/** One argument per line; surrounding whitespace is kept out, empty lines dropped. */
export function parseMCPArguments(text: string): string[] {
  return compact(text.split(/\r?\n/).map((line) => line.trim()))
}
