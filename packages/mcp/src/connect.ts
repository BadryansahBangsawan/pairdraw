#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { platform } from 'node:os'

import { connectLink, resolveConnectAppURL } from '#mcp/agents/link'
import { resolveMCPRoot } from '#mcp/root'
import { MCP_VERSION, startServer } from '#mcp/server'
import { readToolPolicyFromEnv } from '#mcp/tool/policy'
import { resolveCORSOrigins } from '#mcp/transport/origins'

const DEFAULT_PORT = 7600

if (process.argv.includes('--version')) {
  process.stdout.write(`${MCP_VERSION}\n`)
  process.exit(0)
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stdout.write(
    `openpencil-connect\n\n` +
      `Connect OpenPencil in the browser to this computer, so its chat can run\n` +
      `Claude Code, Codex, or Gemini CLI here and use OpenPencil's tools.\n\n` +
      `Starts OpenPencil's MCP server with an agent bridge and opens a one-time link\n` +
      `that pairs the browser tab. Keep it running while you use agents.\n\n` +
      `Options:\n` +
      `  --help, -h    Show this help message\n` +
      `  --version     Print the version\n` +
      `  --no-open     Print the link without opening the browser\n\n` +
      `Environment variables:\n` +
      `  PORT                         TCP port (default: ${DEFAULT_PORT})\n` +
      `  OPENPENCIL_CONNECT_APP_URL   The OpenPencil web app to pair with\n` +
      `                               (default: https://app.openpencil.dev). Its origin may\n` +
      `                               call this server; use it for a development server.\n` +
      `  OPENPENCIL_MCP_CORS_ORIGIN   Further origins allowed to call this server, comma-separated.\n` +
      `  OPENPENCIL_MCP_ROOT          Allowed directory for file-scoped tools (default: home\n` +
      `                               directory on Windows, current working directory elsewhere)\n` +
      `  OPENPENCIL_MCP_SOCKET        Override the Unix socket path\n` +
      `  OPENPENCIL_MCP_DISABLED_TOOLS Comma-separated tool names to omit\n` +
      `  OPENPENCIL_MCP_SCOPE         "selection" to let clients read only the selected layers\n\n` +
      `The eval tool is always off here, and authentication cannot be disabled.\n`
  )
  process.exit(0)
}

function fail(message: string): never {
  process.stderr.write(`Error: ${message}\n`)
  process.exit(1)
}

const portText = (process.env.PORT ?? String(DEFAULT_PORT)).trim()
if (!/^\d+$/.test(portText)) fail(`PORT must be an integer in 1–65535, got "${portText}"`)
const port = Number.parseInt(portText, 10)
if (port < 1 || port > 65535) fail(`PORT must be an integer in 1–65535, got "${portText}"`)

const appURL = resolveConnectAppURL(process.env.OPENPENCIL_CONNECT_APP_URL)
if (!appURL) {
  fail('OPENPENCIL_CONNECT_APP_URL must be an https URL, or http on localhost')
}

const explicitToken = process.env.OPENPENCIL_MCP_AUTH_TOKEN?.trim()
const toolPolicy = readToolPolicyFromEnv()

let handle: Awaited<ReturnType<typeof startServer>>
try {
  handle = await startServer({
    httpPort: port,
    withTcp: true,
    socketPath: process.env.OPENPENCIL_MCP_SOCKET?.trim() || null,
    // The browser runs agents that can edit files; eval would let a page run code here too.
    enableEval: false,
    disabledTools: toolPolicy.disabledTools,
    scope: toolPolicy.scope,
    mcpRoot: resolveMCPRoot(process.env.OPENPENCIL_MCP_ROOT),
    // Auth always stays on: a paired tab and local MCP clients each bring their own token.
    authToken: explicitToken || undefined,
    corsOrigin: [...resolveCORSOrigins(process.env.OPENPENCIL_MCP_CORS_ORIGIN), appURL.origin],
    agents: {}
  })
} catch (error) {
  const code = error instanceof Error && 'code' in error ? error.code : null
  if (code === 'EADDRINUSE') {
    fail(
      `port ${port} or the MCP socket is already in use. Quit the OpenPencil desktop app or ` +
        `another MCP server, or start this one with PORT=${port + 1}.`
    )
  }
  fail(error instanceof Error ? error.message : String(error))
}

const issueCode = handle.issuePairingCode
if (!issueCode) fail('The agent bridge did not start.')

/** Opens the link in the default browser, without a shell. */
function openBrowser(url: string): void {
  const os = platform()
  let command = 'xdg-open'
  let args = [url]
  if (os === 'darwin') command = 'open'
  if (os === 'win32') {
    command = 'rundll32'
    args = ['url.dll,FileProtocolHandler', url]
  }
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true })
    child.on('error', () => undefined)
    child.unref()
  } catch {
    process.stdout.write('Could not open the browser; open the link above yourself.\n')
  }
}

const shouldOpen = !process.argv.includes('--no-open')

function announceLink(open: boolean) {
  const link = connectLink(appURL, issueCode(), handle.httpPort, DEFAULT_PORT)
  process.stdout.write(
    `\nOpen this link to connect OpenPencil to this computer (works once, for 2 minutes):\n` +
      `  ${link}\n\n` +
      `Press Enter for a new link. Press Ctrl+C to stop.\n`
  )
  if (open) openBrowser(link)
}

process.stdout.write(`OpenPencil companion ${MCP_VERSION}\n`)
process.stdout.write(`  HTTP:   http://127.0.0.1:${handle.httpPort}\n`)
if (handle.socketPath) process.stdout.write(`  Socket: ${handle.socketPath}\n`)
announceLink(shouldOpen)

process.stdin.on('data', () => announceLink(false))
process.stdin.on('error', () => undefined)
process.stdin.resume()

const shutdown = async () => {
  process.stdout.write('\nStopping the OpenPencil companion...\n')
  await handle.close()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown().catch(() => process.exit(1)))
process.on('SIGTERM', () => void shutdown().catch(() => process.exit(1)))
