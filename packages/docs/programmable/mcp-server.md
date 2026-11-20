---
title: MCP Server
description: Connect Claude Code, Codex, VS Code Copilot, Antigravity, Hermes Agent, Cursor, and other MCP clients to Pairdraw for AI-assisted design inspection and editing.
---

# MCP Server

Pairdraw includes an MCP (Model Context Protocol) server that lets AI coding tools — Claude Code, Codex, GitHub Copilot in VS Code, Antigravity, Hermes Agent, Cursor, Windsurf, etc. — read and modify designs through the running app.

Two transports: **stdio** for MCP clients, and **Streamable HTTP** for browser extensions and scripts. On macOS and Linux, local clients prefer a private Unix domain socket; Windows and unavailable sockets fall back to localhost TCP.

Tool definitions own native Valibot input schemas, execution/mutation metadata, capabilities, and optional interface exposure exclusions. Tools are included by default; `exposure: { mcp: false, ai: false, webmcp: false }` can exclude them independently from each adapter. Exposure does not bypass execution support or user permissions: WebMCP still requires supported execution and explicit Off, Inspect, or Edit access. AI and MCP consume the same schema through Standard Schema; WebMCP derives its JSON Schema from that input. Numeric strings are accepted consistently across adapters, while non-finite values are rejected. Programmatic integrations use MCP SDK v2; custom tools replace the former `params`/`ParamDef` contract with `input` and execution metadata.

## Tool access settings

Use **Settings → Tool access** (select **Local MCP**) to search and toggle the local server's tools, individually or by read-only/side-effect group. Group switches affect all group members, even during search. **Restore defaults** enables the configurable MCP tools again. Existing MCP preferences are preserved separately from the **Built-in AI** settings.

Restart the MCP server, then reconnect stdio clients, to apply changes. For an externally managed server, restart its owning process. The list shows the tools the server offers, also while it is stopped; disabling a dedicated tool does not prevent an enabled script tool from performing the same operation. These switches are not a sandbox and do not configure remote MCP servers or WebMCP.

## Share only the selection {#selection-scope}

Turn on **Share only the selection** in **Settings → MCP → Local server** to let MCP clients read only the layers you select. Clients then get `get_selection`, `get_node`, `get_page_tree`, `describe`, and `export_image`, and no tools that edit, open files, list documents, or change settings. Every node a call names must be a selected layer or inside one; `describe` and `export_image` read the selection when given no IDs, and `get_page_tree` needs a `root_id` from the selection. `export_image` returns the image but cannot write it to a file. With nothing selected, calls fail and ask the user to select layers.

The server enforces this on every call it sends to the app, including `POST /rpc` and stdio clients, so a client cannot widen it. Restart the MCP server to apply the change. For a server you start yourself, set `PAIRDRAW_MCP_SCOPE=selection`; a stdio client can also set it to limit itself while the server shares the whole document.

## Browser-native WebMCP (experimental) {#webmcp}

WebMCP is **off by default**. Open **Settings → MCP → WebMCP** and choose **Inspect** for read-only access or **Edit** to also allow scoped, undoable changes. **Off** unregisters all browser tools; changing modes revokes the previous registrations immediately. This preference is independent of local MCP authentication, tool switches, and outbound connections.

For local testing, use a Chrome version exposing `document.modelContext`, enable `chrome://flags/#enable-webmcp-testing`, and relaunch the browser. Open a document, enable access in Settings, and connect a WebMCP-capable browser agent or the [Model Context Tool Inspector](https://developer.chrome.com/docs/ai/webmcp). Settings shows browser support and registration status. See the [Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) for current availability.

In supported browsers, Pairdraw registers the selected reviewed set of tools directly in the workspace. Browser agents can inspect nodes, JSX, variables, components, and design patterns, and edit existing layer properties and variable values without installing or connecting an MCP server.

Tools target the document and page active when the call starts. Switching tabs does not redirect an in-flight call. Closing the workspace unregisters the tools. Tool inputs are validated and large inspection results require a narrower query. Oversized editing results are omitted with a committed-edit notice rather than reporting a successful edit as failed.

Edits to geometry, paints, layout, text, and variable bindings/values commit synchronously as individual undoable operations. Failed edits roll back, and undo targets the original document/page even after a page switch. Cancellation prevents an edit from starting; cancellation after commit does not reverse it. Font loading finishes separately without holding a mutation transaction open. Atomic editing currently requires a document with at most 10,000 nodes and variables combined; this shared limit also applies when the same editing tools run through app AI/MCP.

This surface does **not** expose structural creation/deletion, arbitrary JavaScript/JSX execution, image loading, filesystem operations, or credentials. Those tools retain their existing AI/MCP paths. WebMCP is an evolving browser proposal, not universally available; unsupported browsers continue to use Pairdraw normally. The stdio and HTTP integrations below remain independent.

## Install

```sh
npm install -g @pairdraw/mcp
```

## Stdio (Claude Code, Codex, VS Code, etc.)

The stdio server discovers the running Pairdraw app automatically. It prefers the app's Unix domain socket on macOS and Linux and falls back to localhost TCP when needed. Make sure the desktop app is open with a document loaded.

Every client below starts the same command, `pairdraw-mcp`, from `npm install -g @pairdraw/mcp`. Name the server `pairdraw` so tool names and the examples here match.

### Set up from the desktop app {#client-setup}

The desktop app can write the entry for you. Open **Settings → MCP → Other apps** and turn on each app you use: Claude Code, Claude Desktop, Codex, Gemini CLI, OpenCode, Kiro, Cursor, VS Code, or omp. Turning a switch on adds a `pairdraw` entry that starts `pairdraw-mcp` to that app's own config file, the file this page names for it; turning it off removes the entry again. Everything else in the file, including comments and formatting, stays as it was, and before its first change the app keeps a copy of the file next to it with `.pairdraw.bak` appended to the name.

| App            | File                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| Claude Code    | `~/.claude.json` (in `CLAUDE_CONFIG_DIR` when set)                            |
| Claude Desktop | `claude_desktop_config.json` in Claude's settings folder                      |
| Codex          | `~/.codex/config.toml` (in `CODEX_HOME` when set)                             |
| Gemini CLI     | `~/.gemini/settings.json`                                                     |
| OpenCode       | `~/.config/opencode/opencode.json`, or `opencode.jsonc` when only that exists |
| Kiro           | `~/.kiro/settings/mcp.json`                                                   |
| Cursor         | `~/.cursor/mcp.json`                                                          |
| VS Code        | `mcp.json` in your user profile                                               |
| omp            | `~/.omp/agent/mcp.json` (in `PI_CODING_AGENT_DIR` when set)                   |

An app shows as not found until its settings folder exists, so run it once first. A switch stays locked when the file has syntax errors, or when the entry was written by hand in a form the app does not rewrite, such as a Codex inline table, or Codex keeps all its servers in one inline `mcp_servers = { … }` table; edit the file yourself in those cases. The desktop shell checks each write itself and refuses one that would change anything in the file beyond that entry. Restart the app, or reload its MCP servers, after a change. Apps started from the Dock or Start menu may not see the folder npm installs global commands into; if one cannot start `pairdraw-mcp`, set the entry's `command` to the full path that `which pairdraw-mcp` (or `where pairdraw-mcp` on Windows) prints.

### Claude Code

Install the MCP package and register it with Claude Code:

```sh
npm install -g @pairdraw/mcp
claude mcp add --scope user pairdraw -- pairdraw-mcp
```

Check the connection:

```sh
claude mcp list
```

Claude Code asks before using each MCP tool unless you allow the server's tools. To auto-approve Pairdraw tools only, add this to `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["mcp__pairdraw__*"]
  }
}
```

This is narrower than `--permission-mode bypassPermissions`, which skips prompts for every tool. You can also approve tools interactively from Claude's prompt by choosing “Yes, and don't ask again”.

Example prompt:

```text
Use the pairdraw MCP server to inspect the current page and create a small hero section on the canvas.
```

Type `/mcp__pairdraw__design` to load the [design skill](#design-skill) into the conversation, or mention `@pairdraw:pairdraw://skills/pairdraw/SKILL.md` to attach it.

### Codex

Register the server with the Codex CLI:

```sh
codex mcp add pairdraw -- pairdraw-mcp
```

This writes the entry to `~/.codex/config.toml`, where you can also add it by hand:

```toml
[mcp_servers.pairdraw]
command = "pairdraw-mcp"
```

Run `/mcp` in Codex to check the connection. The Codex IDE extension reads the same file. Codex follows the server's instructions, which tell it to call `read_skill` before designing.

### GitHub Copilot in VS Code

Add the server to the workspace's `.vscode/mcp.json`. VS Code uses a `servers` key, not `mcpServers`:

```json
{
  "servers": {
    "pairdraw": {
      "type": "stdio",
      "command": "pairdraw-mcp"
    }
  }
}
```

To add it to your user profile instead, run:

```sh
code --add-mcp '{"name":"pairdraw","type":"stdio","command":"pairdraw-mcp"}'
```

Start the server from the `mcp.json` editor or with **MCP: List Servers**, then use the tools from Copilot Chat in agent mode. Type `/pairdraw.design` to load the [design skill](#design-skill), or attach its files from **Add Context** → **MCP Resources**.

### Antigravity

In the Agent panel, open the **…** menu and choose **MCP Servers** → **Manage MCP Servers** → **View raw config**. Add the server to `mcp_config.json` and save:

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

Keep any servers already in the file. Refresh the list in **Manage MCP Servers** to connect.

### Hermes Agent

Add the server under `mcp_servers` in `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  pairdraw:
    command: 'pairdraw-mcp'
```

Run `/reload-mcp` in a running session, or start a new one. Hermes also offers the server's resources and prompts as tools, so the agent can read the [design skill](#design-skill) through `read_skill` or the resources.

### Other MCP clients

Add to your MCP config (for example `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

Or run from source without installing:

::: code-group
```json [Bun]
{
  "mcpServers": {
    "pairdraw": {
      "command": "bun",
      "args": ["/path/to/pairdraw/packages/mcp/src/stdio.ts"]
    }
  }
}
```

```json [Node.js]
{
  "mcpServers": {
    "pairdraw": {
      "command": "npx",
      "args": ["tsx", "/path/to/pairdraw/packages/mcp/src/stdio.ts"]
    }
  }
}
```
:::

## HTTP

For browser extensions, scripts, CI, or any HTTP client:

```sh
pairdraw-mcp-http
```

Or from source: `bun packages/mcp/src/index.ts` / `npx tsx packages/mcp/src/index.ts`

Security defaults:

- Unix socket and discovery files are created with owner-only permissions on macOS and Linux.
- TCP binds to `127.0.0.1` and uses port 7600 by default.
- Authentication is enabled by default with a generated token stored in the private discovery file.
- `eval` is disabled.
- File operations are limited to `PAIRDRAW_MCP_ROOT` (defaults to the current working directory) and reject symlink escapes.
- The browser app reaches those files through the server: `open_file` reads one, `save_file` with a path (or `new_document` with one) writes a copy there, and `save_file` without a path writes a document opened through the server back to its own file.
- Only the desktop app's own origin (`tauri://localhost` and its `http(s)://tauri.localhost` variants) is allowed by default, so a server you start yourself works from the app without extra configuration. Set `PAIRDRAW_MCP_CORS_ORIGIN` to a comma-separated list to allow other origins, such as a worktree dev server.

Set `PORT=0` to disable TCP on macOS and Linux. Windows requires TCP. Set `PAIRDRAW_MCP_SOCKET` to override the Unix socket path, or `PAIRDRAW_MCP_DISCOVERY_PATH` to override the discovery file location. To provide a stable token, set `PAIRDRAW_MCP_AUTH_TOKEN`; an explicitly empty value disables authentication and should only be used with a trusted local socket.

Endpoints are available over both active transports:

- `GET /health` — server and app connection status; never returns the auth token.
- `POST /rpc` — authenticated live-app automation.
- `POST /mcp` — MCP Streamable HTTP. Sessions use the `mcp-session-id` header.

## Workflow

1. **Discover targets** — call `list_documents` first when more than one document or page may be open. It returns stable `document_id` and page IDs.
2. **Open** — `open_file` to load an existing `.fig`, or `new_document` for a blank canvas. `list_recent_files` lists recently opened files inside the MCP root to reopen. These return target metadata for the opened or created document.
3. **Read** — `get_page_tree`, `find_nodes`, `get_node`, `list_pages`
4. **Create** — `create_shape`, `render` (JSX)
5. **Modify** — `set_fill`, `set_stroke`, `set_layout`, `update_node`, `set_effects`, `set_reactions`
6. **Structure** — `reparent_node`, `group_nodes`, `clone_node`, `delete_node`
7. **Save** — `save_file` to write back to `.fig`
8. **Close** — `close_file` to close an open document tab. With unsaved changes it fails unless `unsaved` is `"save"` or `"discard"`; it never prompts in the app. Without `document_id`, close changes only a document that this session opened. Save without `document_id` saves the document this session is targeting, or the document in front. Pass `document_id` to close or save any other open document. `open_file` owns a document only when that call opened it.

`undo` and `redo` step back through the agent's own changes, and `activate_document` brings a tab to the front when the user should see it.

Each session keeps the document it edits, including after the person switches tabs. `POST /rpc` calls that name no session share one `anonymous` document. Home and a New file tab are left out of `list_documents`. An edit with no document chosen, while one of those is in front, opens a document tab and leaves the current tab in front. When the session's document has been closed, the call fails until the session calls `list_documents` and passes `document_id`, or calls `new_document` or `open_file`. An HTTP session that sits idle for 15 minutes ends. The next session does not keep that document, so its first edit opens its own tab.

Each MCP session shows in the app as an agent with a callsign, like the built-in chat: its cursor and outline sit on the layers each tool reads or changes, it rests after a quiet spell and leaves when the session ends, and people can follow it from their avatar. Collaborators in a shared room see it too.

Most tools accept optional `document_id` and `page_id` fields. Pass them explicitly for agent workflows instead of relying on the visible active tab/page. `create_page` only creates a page; call `switch_page` separately when the workflow should change the active page.

## AI Agent Skill

Teach your AI coding agent to use Pairdraw tools:

```sh
npx skills add BadryansahBangsawan/pairdraw
```

Works with Claude Code, Cursor, Windsurf, Codex, and any agent that supports [skills](https://skills.sh). The skill covers the CLI, MCP tools, JSX rendering, eval, and the running app's automation bridge.

### Design skill over MCP {#design-skill}

Clients that cannot install skills read the same skill from the server, which embeds the copy it was released with:

- **Instructions** — when a client connects, the server tells it to read the skill before designing, naming only the tools that Tool access and the shared scope leave on. Codex, Claude Code, and other clients that support server instructions pass this to the model. Agents in the app's own chat skip this step, because their prompt already includes the design reference.
- **`read_skill` tool** — returns `SKILL.md`, or with `path: "references/design-authoring.md"` the JSX reference for `render`. It works in every client that supports tools.
- **Resources** — `pairdraw://skills/pairdraw/SKILL.md` and `pairdraw://skills/pairdraw/references/design-authoring.md`, as Markdown.
- **`design` prompt** — loads both files into the conversation, with an optional `task` such as `a pricing page`. Clients show it as a slash command.

The resources and the prompt stay available when `read_skill` is turned off in **Tool access** or the server [shares only the selection](#selection-scope).

## Tools

Pairdraw currently registers 139 shared design tools, plus MCP-only document and prompt operations when applicable.

### Document

| Tool                | Description                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `open_file`         | Open a `.fig` file for editing                                                                       |
| `close_file`        | Close an open document tab; `unsaved: "save"` or `"discard"` decides what happens to unsaved changes |
| `save_file`         | Save the current document to a `.fig` file                                                           |
| `new_document`      | Create a new empty document                                                                          |
| `list_documents`    | List open app documents/tabs and their pages                                                         |
| `list_recent_files` | List recently opened files inside the MCP root, newest first, up to the app's recent files limit     |
| `activate_document` | Bring a document tab to the front, optionally on a given page                                        |

### History

| Tool   | Description                                          |
| ------ | ---------------------------------------------------- |
| `undo` | Undo the newest change made through MCP or the CLI   |
| `redo` | Redo the newest change undone through MCP or the CLI |

The history is shared with the person in the editor. `undo` and `redo` refuse when the newest step was made in the editor, so an agent never reverts the user's work. Each editing tool call is one undo step, wherever in the document its edits land, including those an `eval` script makes after switching `figma.currentPage`. A call that fails part way, such as an `eval` script that throws, is rolled back whole: the document is left as it was and no step is recorded. If someone else changed the document while the call ran, such as you in the editor or a collaborator, nothing is rolled back, so their work stays, and the failed call is kept as one undo step.

### Settings

| Tool              | Description                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `get_settings`    | Read editor settings: appearance, snapping, canvas rendering, recovery, AI chat, and design check preferences |
| `update_settings` | Change settings with a partial object shaped like `get_settings` output; invalid keys and values are rejected |

Settings tools never expose credentials, AI models, MCP connections, storage, or tool access. The available keys are listed in [Controlling the App](/programmable/cli/app-control#settings).

### Read

| Tool                   | Description                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_selection`        | Get the selected nodes, with their direct children by default; `depth` sets how many levels                                                                                                                         |
| `get_page_tree`        | Get the full node tree of the current page                                                                                                                                                                          |
| `get_current_page`     | Get the current page name and ID                                                                                                                                                                                    |
| `get_node`             | Get detailed properties of a node by ID                                                                                                                                                                             |
| `find_nodes`           | Find nodes by name pattern and/or type                                                                                                                                                                              |
| `get_components`       | List the document's components and those of enabled libraries; a component with slots lists each slot's preferred components and whether it takes only those                                                        |
| `list_pages`           | List all pages                                                                                                                                                                                                      |
| `list_variables`       | List design variables                                                                                                                                                                                               |
| `list_collections`     | List variable collections                                                                                                                                                                                           |
| `list_fonts`           | List fonts used in the current page                                                                                                                                                                                 |
| `list_available_fonts` | List font families the current host can render                                                                                                                                                                      |
| `get_font_status`      | Report requested faces, loaded sources, active substitutions, why an installed face could not be loaded, and affected nodes                                                                                         |
| `page_bounds`          | Get bounding box of all objects on the current page                                                                                                                                                                 |
| `find_empty_space`     | Find a free spot of a given size for new content, beside everything on the page or next to `near_id`, optionally on one side (`direction`) with a `gap`; returns `x` and `y` ready for `render` or the create tools |
| `node_bounds`          | Get bounding box of a node                                                                                                                                                                                          |
| `node_ancestors`       | Get ancestor chain of a node                                                                                                                                                                                        |
| `node_children`        | Get direct children of a node                                                                                                                                                                                       |
| `node_tree`            | Get the subtree rooted at a node                                                                                                                                                                                    |
| `node_bindings`        | Get variable bindings on a node                                                                                                                                                                                     |

### Create

| Tool                | Description                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_shape`      | Create a shape (`FRAME`, `RECTANGLE`, `ELLIPSE`, `TEXT`, `LINE`, `STAR`, `POLYGON`, `SECTION`)                                                                                                |
| `create_vector`     | Create a vector node from a path string                                                                                                                                                       |
| `create_slice`      | Create an export slice                                                                                                                                                                        |
| `create_connector`  | Join two layers, or a layer and a point, with a connector that follows them                                                                                                                   |
| `create_page`       | Create a new page                                                                                                                                                                             |
| `render`            | Render JSX to design nodes — create entire component trees in one call                                                                                                                        |
| `create_component`  | Convert a frame/group into a component                                                                                                                                                        |
| `create_instance`   | Create an instance of a component                                                                                                                                                             |
| `detach_instance`   | Detach instances into plain frames, keeping their children, overrides, and position                                                                                                           |
| `create_slot`       | Make a frame inside a main component a slot, optionally with preferred components, only those allowed, and a child limit                                                                      |
| `insert_icon`       | Insert icons by name; Material Symbols icons take `weight`, `fill`, `grade`, and `optical_size`, which they keep when swapped                                                                 |
| `import_html`       | Import HTML and CSS as editable layers: `<style>` blocks apply, `css` adds a stylesheet, and `tailwind: true` compiles the Tailwind classes the markup uses; flex and grid become auto layout |
| `set_behaviour`     | Make a component behave as a Reka UI control, by its property and slot names; `null` removes it                                                                                               |
| `get_behaviour`     | Read a component's behaviour and what it still misses; without an ID, list every kind                                                                                                         |
| `node_to_component` | Convert an existing node into a component in-place                                                                                                                                            |

### Image AI

These run in the app on the services and keys set up in **Settings → Image services** (BYOK); elsewhere they answer that they are unavailable. Each result is one undo step, and a layer or image that changed while the service worked is left alone.

| Tool                 | Description                                                                                                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate_image`     | Generate an image from a prompt: with `id` it fills that layer, replacing the image it shows; without, it becomes a new rectangle at the image's size (or `width`), beside the page's content unless `x` and `y` are given. `orientation` is `square`, `landscape`, or `portrait`; `transparent` asks for a cut-out |
| `remove_background`  | Cut the subject of a layer's image out onto transparency, keeping the layer's size and crop                                                                                                                                                                                                                         |
| `replace_background` | Replace the background of a layer's image with one a `prompt` describes, keeping the subject                                                                                                                                                                                                                        |
| `generate_svg`       | Generate vector art from a prompt with the vectorize service and import it as editable layers, as `import_svg` does                                                                                                                                                                                                 |

### Modify

| Tool                          | Description                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `set_fill`                    | Set fill color (hex)                                                                                                                                                                                                                                                                  |
| `set_image_fill`              | Fill a layer with an image from base64 `image_data` or a `url` (http, https, or data); `scale_mode` is `FILL` (default), `FIT`, `CROP`, `TILE`, or `STRETCH`, which stretches the whole image to the layer as the image fill panel's Stretch does                                     |
| `replace_matching_properties` | Swap fill, text, or stroke colors, stroke weights, corner radii, font families, styles, or sizes for others everywhere on the page, the selection, or given layers; keeps instance overrides, and returns the layers of read-only library components it left unchanged in `read_only` |
| `set_stroke`                  | Set stroke color, weight, alignment                                                                                                                                                                                                                                                   |
| `set_effects`                 | Add shadow or blur effects                                                                                                                                                                                                                                                            |
| `update_node`                 | Update position, size, opacity, corner radius, text, font                                                                                                                                                                                                                             |
| `set_layout`                  | Set auto-layout (flexbox) — direction, spacing, padding, alignment                                                                                                                                                                                                                    |
| `set_constraints`             | Set resize constraints                                                                                                                                                                                                                                                                |
| `set_rotation`                | Set rotation angle in degrees                                                                                                                                                                                                                                                         |
| `set_opacity`                 | Set opacity (0–1)                                                                                                                                                                                                                                                                     |
| `set_radius`                  | Set corner radius (uniform or per-corner)                                                                                                                                                                                                                                             |
| `set_minmax`                  | Set min/max width and height constraints                                                                                                                                                                                                                                              |
| `set_text`                    | Set text content of a `TEXT` node                                                                                                                                                                                                                                                     |
| `set_font`                    | Set font family and weight                                                                                                                                                                                                                                                            |
| `set_font_range`              | Set font properties, color, or a `hyperlink` on a character range                                                                                                                                                                                                                     |
| `set_text_resize`             | Set text auto-resize mode (fixed/auto-width/auto-height)                                                                                                                                                                                                                              |
| `set_visible`                 | Show or hide a node                                                                                                                                                                                                                                                                   |
| `set_blend`                   | Set blend mode                                                                                                                                                                                                                                                                        |
| `set_locked`                  | Lock or unlock a node                                                                                                                                                                                                                                                                 |
| `set_stroke_align`            | Set stroke alignment (inside/center/outside)                                                                                                                                                                                                                                          |
| `set_text_properties`         | Set text layout: alignment, auto-resize, text case, decoration, truncation, and a `hyperlink` for the whole text. Links take http, https, and mailto addresses (`example.com` becomes `https://example.com`); `null` or `""` removes one                                              |
| `set_layout_child`            | Configure auto-layout child: sizing, grow, alignment, absolute positioning                                                                                                                                                                                                            |
| `node_move`                   | Move a node to a new position                                                                                                                                                                                                                                                         |
| `node_resize`                 | Resize a node                                                                                                                                                                                                                                                                         |
| `rescale`                     | Scale layers as the Scale tool (K) does, with their text, strokes, radii, effects, and spacing, around an `anchor` of their joint bounds (`top-left` by default); `factor` 2 doubles; locked layers and layers inside instances are listed in `skipped`                               |
| `node_replace_with`           | Replace a node with another node                                                                                                                                                                                                                                                      |
| `arrange`                     | Spread overlapping layers apart, pack them, place them in a grid, row, or column, or lay them out along their connectors as a flow, tree, radial map, or network                                                                                                                      |

### Prototype

Connections use Figma's plugin shape, the same shape the layer's `reactions` exposes in scripts: `[{ trigger: { type: "ON_CLICK" } | { type: "AFTER_TIMEOUT", timeout }, actions: [{ type: "NODE", destinationId, navigation: "NAVIGATE" | "OVERLAY", transition: { type: "INSTANT" | "DISSOLVE", duration }, overlayRelativePosition }, { type: "BACK" }, { type: "CLOSE" }] }]`. A destination is a top-level frame on the layer's page; a trigger, action, transition, navigation or overlay spot the prototype play cannot run is refused with the reason.

| Tool            | Description                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| `get_reactions` | Read a layer's prototype connections, in Figma's plugin shape; empty when it connects to nothing              |
| `set_reactions` | Replace a layer's prototype connections; one undo step, as the Prototype panel's edits are                    |

### Structure

| Tool                | Description                         |
| ------------------- | ----------------------------------- |
| `delete_node`       | Delete a node                       |
| `clone_node`        | Duplicate a node                    |
| `rename_node`       | Rename a node                       |
| `reparent_node`     | Move a node into a different parent |
| `select_nodes`      | Select nodes by ID                  |
| `group_nodes`       | Group nodes                         |
| `ungroup_node`      | Ungroup a group                     |
| `flatten_nodes`     | Flatten nodes into a single vector  |
| `boolean_union`     | Boolean union of two or more nodes  |
| `boolean_subtract`  | Boolean subtraction                 |
| `boolean_intersect` | Boolean intersection                |
| `boolean_exclude`   | Boolean exclusion                   |

### Vector Path

| Tool              | Description                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path_get`        | Get the path data of a vector node                                                                                                                                                          |
| `path_set`        | Set the path data of a vector node                                                                                                                                                          |
| `path_scale`      | Scale a vector path                                                                                                                                                                         |
| `path_flip`       | Flip a vector path horizontally or vertically                                                                                                                                               |
| `path_move`       | Translate a vector path                                                                                                                                                                     |
| `vectorize_image` | Convert a layer's image fill into editable vector paths in a new frame beside it, keeping the image. Runs in the app with the vectorize service and key set up in Settings → Image services |

### Export

| Tool           | Description                                                                                                                                                                                                                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `export_image` | Export nodes as PNG, JPG, or WEBP. Returns base64-encoded image data; `quality` (1–100, default 90) sets JPG and WEBP compression                                                                                                                                                                                                                  |
| `export_html`  | Export nodes as HTML: `style` `css` (default) or `tailwind`; `html` `fragment` (default) or `standalone`; `assets` `inline` (default) or `external`, which returns a standalone page's stylesheet, images, and web fonts as separate files; `layer_names` (default true) writes `data-name` and `layer_ids` (default false) writes each layer's ID |
| `export_svg`   | Export nodes as SVG markup                                                                                                                                                                                                                                                                                                                         |

### Viewport

| Tool                   | Description                                  |
| ---------------------- | -------------------------------------------- |
| `viewport_get`         | Get current viewport position and zoom level |
| `viewport_set`         | Set viewport position and zoom               |
| `viewport_zoom_to_fit` | Zoom viewport to fit specified nodes         |

### Variables

| Tool                | Description                             |
| ------------------- | --------------------------------------- |
| `get_variable`      | Get a variable by ID or name            |
| `find_variables`    | Find variables by name pattern or type  |
| `create_variable`   | Create a new variable in a collection   |
| `set_variable`      | Set a variable value in a mode          |
| `delete_variable`   | Delete a variable                       |
| `bind_variable`     | Bind a variable to a node property      |
| `get_collection`    | Get a variable collection by ID or name |
| `create_collection` | Create a new variable collection        |
| `delete_collection` | Delete a variable collection            |

### Analyze

| Tool                 | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `analyze_colors`     | Analyze color palette usage across the document                            |
| `analyze_typography` | Analyze font/size/weight distribution                                      |
| `analyze_spacing`    | Analyze gap and padding values                                             |
| `analyze_clusters`   | Detect repeated patterns (potential components)                            |
| `lint`               | Check accessibility and consistency issues, with fixes and suggestions     |
| `lint_fix`           | Apply safe lint fixes, and optionally the first suggestion of each finding |

### Diff

| Tool           | Description                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `diff_create`  | Patch that turns one node tree into another, as JSX attribute changes                                                                                                                                                     |
| `diff_jsx`     | Structural diff between two nodes as design JSX                                                                                                                                                                           |
| `diff_show`    | Preview the patch that setting JSX attributes on a node would produce                                                                                                                                                     |
| `diff_apply`   | Apply a patch after checking the nodes still match its old values                                                                                                                                                         |
| `diff_visual`  | Pixel diff between two rendered nodes, returned as an image                                                                                                                                                               |
| `diff_changes` | Patch of what changed on a node or the current page: call it with `mark: true` to record the page as it is, then again to see what changed since; in the AI chat it compares with the page before the run first edited it |

### Comments

| Tool               | Description                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `get_comments`     | Read the comments left on the canvas, open ones unless asked for resolved too, with their layer, page, and replies |
| `add_comment`      | Pin a comment on a layer or at a point of a page, in Markdown                                                      |
| `reply_to_comment` | Answer a thread, which reopens it if it was resolved                                                               |
| `resolve_comment`  | Resolve a thread once its feedback is addressed, or reopen it                                                      |

### Statuses

| Tool           | Description                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `get_statuses` | List the document's statuses and the sections, frames, components, and instances that show one, optionally only one status |
| `set_status`   | Give a layer one of the document's statuses by name, or clear it                                                           |

### Navigation

| Tool          | Description                    |
| ------------- | ------------------------------ |
| `switch_page` | Switch to a page by name or ID |

### Guidance

| Tool                 | Description                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `read_skill`         | Read the Pairdraw agent skill or its design authoring reference; see [Design skill over MCP](#design-skill)                                                                   |
| `get_codegen_prompt` | Get the design-to-code guidelines to follow before generating frontend code                                                                                                   |
| `get_style`          | List curated style directions, best match first for a `query`, or get one by `id`: palette by role, font pairing, type scale, radii, spacing, elevation, and written guidance |

### Escape Hatch

| Tool   | Description                                          |
| ------ | ---------------------------------------------------- |
| `eval` | Execute JavaScript with full Figma Plugin API access |

Note: `eval` is off by default over both transports; set `PAIRDRAW_MCP_EVAL=1` to expose it. The `pairdraw-connect` companion never exposes it, even with that variable set.
