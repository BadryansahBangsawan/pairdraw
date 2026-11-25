---
title: Open by design
description: "Pairdraw's ground rules: no MCP call caps, no account, no seats, local files, MIT, and your own agent and key. Copy-paste setup for Claude Code, Codex, Cursor, and Pi."
---

# Open by design

This page states the rules Pairdraw is built on, so you can check them against the tool you use today.

| | Pairdraw | What it means in practice |
| --- | --- | --- |
| MCP call caps | None | An agent can read, edit, and re-read as often as the task needs. Your provider's rate limit is the only meter ([MCP server](/programmable/mcp-server)). |
| Account | None | Nothing to sign in to, and no document upload. A local document never leaves the machine ([README](https://github.com/BadryansahBangsawan/pairdraw#readme)). |
| Seats | None | Everyone who opens the app runs the whole editor. |
| Agent | Yours | Claude Code, Codex, Cursor, Pi, or anything that speaks MCP. The built-in chat uses your own key. |
| Key | Yours | BYOK for any OpenAI- or Anthropic-compatible endpoint; no markup and no credit pool ([BYOK compatibility](/programmable/byok-provider-compatibility)). |
| Files | Local | `.fig` and `.pen` files on disk, opened and saved without a server. |
| Licence | MIT | Editor, CLI, and packages. Pairdraw Cloud is Apache-2.0 ([LICENSE](https://github.com/BadryansahBangsawan/pairdraw/blob/main/LICENSE)). |

None of this is a trial tier. The same editor is what you get with no account.

## Setup

Install the server once, then register it with the agent you use. The app must be open with a document loaded, because the server talks to the running editor. Every client starts `pairdraw-mcp`.

```sh
npm install -g @pairdraw/mcp
```

### Claude Code

```sh
claude mcp add --scope user pairdraw -- pairdraw-mcp
```

### Codex

```sh
codex mcp add pairdraw -- pairdraw-mcp
```

That writes `~/.codex/config.toml`, where the entry can also be added by hand:

```toml
[mcp_servers.pairdraw]
command = "pairdraw-mcp"
```

### Cursor

Add the server to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

### Pi

Add the server to `~/.omp/agent/mcp.json`, or to the folder named by `PI_CODING_AGENT_DIR` when it is set:

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

Restart or reload the agent after a change. Settings → MCP → Other apps can write these entries for you and keeps a `.pairdraw.bak` copy of each file it edits ([client setup](/programmable/mcp-server#client-setup)).

## Teach the agent the editor

```sh
npx skills add BadryansahBangsawan/pairdraw
```

The skill covers the CLI, the MCP tools, design JSX, and the automation bridge. Clients that cannot install skills read the same text from the server with `read_skill` ([design skill](/programmable/mcp-server#design-skill)).

## What you run yourself

- **The server.** `pairdraw-mcp` for stdio clients, `pairdraw-mcp-http` for scripts and browsers. Both talk to the app on this machine only ([HTTP](/programmable/mcp-server#http)).
- **The model bill.** Pairdraw adds nothing on top of what your provider charges.
- **Sharing.** Live collaboration and share links need the optional self-hosted [Pairdraw Cloud](/user-guide/pairdraw-cloud). There is no hosted instance.
