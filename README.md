# Pairdraw

[![MIT license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![npm](https://img.shields.io/npm/v/@pairdraw/cli?label=%40pairdraw%2Fcli)](https://www.npmjs.com/package/@pairdraw/cli)
[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white)](https://discord.gg/4wXc9fuZfm)
[![GitHub Discussions](https://img.shields.io/github/discussions/pairdraw/pairdraw?logo=github&label=Discussions)](https://github.com/BadryansahBangsawan/pairdraw/discussions)

Open-source design editor. Opens `.fig` and `.pen` design files, includes built-in AI, and ships as a programmable toolkit with a headless Vue SDK for building custom editors.

> **Status:** Active development. Usable today, with some rough edges as features evolve.

**[Download](https://github.com/BadryansahBangsawan/pairdraw/releases/latest)** · [Documentation](packages/docs/) · [Roadmap](packages/docs/development/roadmap.md)

![Pairdraw](packages/docs/public/screenshot.png)

## Installation

**macOS (Homebrew):**

```sh
brew install --cask pairdraw
```

Or download from the [releases page](https://github.com/BadryansahBangsawan/pairdraw/releases/latest), or run the web app from a checkout of this repository with `bun install` and `bun run dev` (see [CONTRIBUTING.md](CONTRIBUTING.md)).

Requires macOS 13 or later with current Safari updates, Windows 10 or later, or Linux with WebKitGTK 2.40+; the web app needs Chrome 111, Edge 111, Firefox 128, or Safari 16.4 or later. See [system requirements](packages/docs/getting-started.md#system-requirements).

Official builds send one anonymous ping a day and share usage stats only if you agree. The [privacy page](packages/docs/overview/privacy.md) lists every field, everything else the app sends, and how to turn it off.

## What it does

- **Opens `.fig` and `.pen` files** — read and write native Figma files, open supported Pencil documents from the app or OS file browser, copy & paste nodes between apps
- **AI builds designs** — describe what you want in chat, 100+ tools create and modify nodes. Bring your own key for the major providers or any compatible endpoint
- **Built-in browser** — open `http` and `https` pages in a separate desktop window that shares nothing with the editor, import the whole page or one picked element as layers, place a screenshot on the canvas, and let the chat read the page, mark an element, and click, type, or scroll on it with approval
- **Research on a board** — quote the page open in the built-in browser onto a board as a sticky note that keeps its address, title, quote, and read time ([Research on a board](packages/docs/user-guide/research.md))
- **Fully programmable** — headless CLI, XPath queries, Figma Plugin API plus an `pairdraw` API via `eval`, MCP server for AI agents, and agent integrations for Claude Code, Codex, Gemini CLI, and Pi in the desktop app and, through a local companion, the browser
- **Lint, convert, and extract tokens** — inspect documents, lint naming/layout/accessibility, convert between supported formats, analyze colors/typography/spacing/clusters, and extract design tokens
- **Components and variants** — create reusable components, group variants into component sets, insert local assets as instances, and switch variants from the inspector
- **Working controls** — give a component a Reka UI behaviour (switch, slider, tabs, text field, …) and preview it live over the canvas, with real inputs, focus, and keyboard
- **Script layers** — draw a layer's contents from a JavaScript program stored in the document, with `@input` controls bindable to variables, live re-runs, and one step to convert the result into ordinary layers ([Script layers](packages/docs/user-guide/script-layers.md))
- **Prototypes** — link frames with click or after-delay interactions that navigate, open or close an overlay, or go back, then play them on the canvas with instant or dissolve transitions ([Playing a prototype](packages/docs/user-guide/playing-a-prototype.md))
- **Image vectorization** — convert image layers into editable vector layers with Recraft or fal.ai
- **Design-to-code export** — export selections as JSX/Tailwind, generate token outputs, and map designs into component-oriented code workflows
- **VS Code extension** — open and save `.fig` and `.pen` files in a VS Code custom editor that runs the web editor; it is not published to a marketplace, so build it from the repository ([VS Code extension](packages/docs/programmable/vscode.md))
- **Vue SDK for custom editors** — headless components and composables for embedding Pairdraw into other apps or building workflow-specific editing surfaces. [Read the SDK docs →](packages/docs/programmable/sdk/index.md)
- **Real-time collaboration** — share a peer-to-peer room over WebRTC with no server or account, or edit Cloud documents together. Cursors, presence, follow mode, voice calls
- **Optional Cloud** — keep documents on your team's own [Pairdraw Cloud](packages/docs/user-guide/pairdraw-cloud.md) server and share them by invitation
- **Plugins** — install plugin manifests, run a plugin's command from the command palette on the open document, and grant only the permissions it needs; one plugin runs at a time, and network access is refused ([Plugins](packages/docs/user-guide/plugins.md))
- **Auto layout & CSS Grid** — flex and grid layout via Yoga WASM, with gap, padding, alignment, track sizing
- **~15 MB desktop app** — Tauri v2 for macOS, Windows, Linux. Also runs in the browser as a PWA

## CLI

```sh
npm install -g @pairdraw/cli
# or: bun add -g @pairdraw/cli
```

### Inspect design files

Browse node trees, search by name or type, dig into properties — all without opening the editor:

```sh
pairdraw tree design.fig
pairdraw find design.pen --type TEXT
pairdraw node design.fig --id 1:23
pairdraw info design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

### Query with XPath

Find nodes by type, attributes, and structure:

```sh
pairdraw query design.fig "//FRAME[@width < 300]"  # Frames under 300px
pairdraw query design.fig "//SECTION//TEXT"        # Text inside sections
```

### Export, convert, and import

Render to PNG, JPG, WEBP, SVG, PDF, PPTX, HTML, JSX, Storybook stories, or `.fig`, convert between document formats, and turn HTML/CSS into editable layers:

```sh
pairdraw export design.fig                  # PNG
pairdraw export design.fig -f jpg -s 2      # JPG at 2x
pairdraw export design.fig -f tailwind-jsx  # Tailwind JSX
pairdraw export design.fig -f storybook     # Storybook stories per component
pairdraw convert design.pen design.fig      # Between document formats
pairdraw import card.html --css card.css    # HTML/CSS → editable .fig
```

### Lint and analyze

Catch naming, layout, and accessibility issues, and audit a design system's real palette, type scale, spacing, and repeated components:

```sh
pairdraw lint design.fig --preset strict  # Naming, layout, accessibility
pairdraw analyze colors design.fig        # Also typography, spacing, clusters
pairdraw variables design.fig             # Variables and collections
```

```
#1d1b20  ██████████████████████████████ 17155×
#49454f  ██████████████████████████████ 9814×
#ffffff  ██████████████████████████████ 8620×
#6750a4  ██████████████████████████████ 3967×
```

### Script with the Figma Plugin API

`eval` runs JavaScript against the document with Figma's Plugin API; `-w` writes the result back:

```sh
pairdraw eval design.fig -c "figma.currentPage.selection.forEach(n => n.opacity = 0.5)" -w
```

### Control the running app

Omit the file argument and the CLI works on the document open in the editor:

```sh
pairdraw tree                                 # Inspect the live document
pairdraw documents list                       # Also open, new, save, close, activate
pairdraw tool call get_selection              # Run any MCP tool
pairdraw undo                                 # Undo the newest automation change
pairdraw settings set appearance.theme light  # Change editor settings
```

Every command supports `--json`. See the [CLI reference](packages/docs/reference/cli.md) for all commands and options.

## AI & MCP

### Built-in chat

Press <kbd>⌘</kbd><kbd>J</kbd> (<kbd>Ctrl</kbd><kbd>J</kbd> on Windows and Linux) to open the AI assistant. It has 138 tools that can create shapes, set fills and strokes, manage auto-layout, work with components and variables, run boolean operations, analyze design tokens, and export assets. Bring your own API key for OpenRouter, Anthropic, OpenAI, Google AI, DeepSeek, Z.ai, MiniMax, xAI, Meta, Kimi For Coding, Moonshot AI, Together AI, Fireworks AI, OpenCode Zen and Go, or compatible endpoints. No backend, no account.

Not every provider works in the browser, and not every model streams tool calls correctly. See [BYOK provider & model compatibility](packages/docs/programmable/byok-provider-compatibility.md) for measured results — contributions welcome.

### Coding agents

Use Claude Code, Codex, Gemini CLI, or Pi as the design agent in the chat panel. It runs with your own subscription and reaches the canvas through the editor's MCP server. The desktop app runs them itself; in the web app, run `npx -p @pairdraw/mcp pairdraw-connect` and open the link it prints so a companion on your computer runs Claude Code, Codex, or Gemini CLI ([Coding agents in the browser](packages/docs/programmable/browser-agents.md)).

Install the agent's ACP program and `@pairdraw/mcp`, then open **Settings → Models → Run guided setup**. It checks that both are installed, signs the agent in, and confirms a session reaches Pairdraw's tools. Pi runs through the `@pairdraw/harness` companion, which guided setup installs with one click. See [Coding agents](packages/docs/programmable/coding-agents.md) for each agent's install command.

### MCP server

Connect Claude Code, Cursor, Windsurf, or any MCP client to inspect, modify, and export design documents headlessly. [Full docs →](packages/docs/programmable/mcp-server.md)

**Stdio** (Claude Code, Cursor, Windsurf):

```sh
npm install -g @pairdraw/mcp
claude mcp add --scope user pairdraw -- pairdraw-mcp
```

For other MCP clients:

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

**HTTP** (scripts, CI):

```sh
pairdraw-mcp-http   # Unix socket on macOS/Linux + http://127.0.0.1:7600/mcp
```

Set `PAIRDRAW_MCP_ROOT` to limit file access to one directory; it defaults to the current working directory.

### [AI agent skill](skills/pairdraw/SKILL.md)

Teach your AI coding agent to use Pairdraw — inspect designs, export assets, analyze tokens, modify .fig files:

```sh
npx skills add BadryansahBangsawan/pairdraw
```

Works with Claude Code, Cursor, Windsurf, Codex, and any agent that supports [skills](https://skills.sh).

For documentation-aware agents, building the VitePress docs in `packages/docs` generates `llms.txt`, `llms-full.txt`, and per-page Markdown files.

## Collaboration

Share a link to co-edit in real time. No server, no account — peers connect directly via WebRTC.

1. Click the share button in the top-right panel
2. Share the generated link (`<web app address>/rooms/<room-id>`, or `pairdraw://join?room=<room-id>` from the desktop app)
3. Collaborators see your cursor, selection, and edits in real time
4. Click a peer's avatar to follow their viewport
5. Click the headphones beside the avatars to start or join the room's voice call

## Why

Figma is a closed platform that resists programmatic access: its MCP server is read-only, and automation outside the Plugin API breaks when it ships a point release. Your design files are in a proprietary binary format that only its software can fully read.

Pairdraw is the alternative: open source (MIT), local-first, reads .fig files natively, and every operation is scriptable.

See the [roadmap](packages/docs/development/roadmap.md) for product direction and current Figma compatibility gaps.

## Community

- **[Discord](https://discord.gg/4wXc9fuZfm)** — chat, quick questions, and showing a problem live
- **[GitHub Discussions](https://github.com/BadryansahBangsawan/pairdraw/discussions)** — [Q&A](https://github.com/BadryansahBangsawan/pairdraw/discussions/categories/q-a) for help, [Ideas](https://github.com/BadryansahBangsawan/pairdraw/discussions/categories/ideas) for feature proposals, [Show and tell](https://github.com/BadryansahBangsawan/pairdraw/discussions/categories/show-and-tell) for what you built; maintainers post [Announcements](https://github.com/BadryansahBangsawan/pairdraw/discussions/categories/announcements) there
- **[Issues](https://github.com/BadryansahBangsawan/pairdraw/issues)** — reproducible bugs; report security problems through a [private advisory](https://github.com/BadryansahBangsawan/pairdraw/security/advisories/new)

## Contributing

```sh
bun install
bun run dev:portless  # Web editor at https://pairdraw.localhost
bun run tauri dev     # Desktop app (requires Rust)
```

[CONTRIBUTING.md](CONTRIBUTING.md) covers setup, quality gates, pull requests, and commits. [AGENTS.md](AGENTS.md) maps the repository and links the guide inside each package. Desktop builds need [Rust](https://rustup.rs/) and the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/); run `bun run tauri build`.

### Tech stack

| Layer         | Tech                                                                              |
| ------------- | --------------------------------------------------------------------------------- |
| Rendering     | Skia (CanvasKit WASM)                                                             |
| Layout        | Yoga WASM (flex + grid via [fork](https://github.com/open-pencil/yoga/tree/grid)) |
| UI            | Vue 3, Reka UI, Tailwind CSS 4                                                    |
| File format   | Kiwi binary + Zstd + ZIP                                                          |
| Collaboration | Trystero (WebRTC P2P) + Yjs (CRDT)                                                |
| Desktop       | Tauri v2                                                                          |
| AI/MCP        | Vercel AI SDK (multi-provider BYOK), MCP SDK, Hono                                |

## Acknowledgments

Thanks to [@sld0Ant](https://github.com/sld0Ant) (Anton Soldatov), who pushed for Pairdraw to be published, has backed and promoted it since, and built the first version of the [documentation site](packages/docs/).

Thanks to everyone who has [contributed](https://github.com/BadryansahBangsawan/pairdraw/graphs/contributors) code, translations, bug reports, and feedback.

Thanks to [Anthropic](https://www.anthropic.com) for supporting the project through its open source program, and to [CodeRabbit](https://www.coderabbit.ai) for reviewing every pull request for free.

## License

Pairdraw is licensed under the [MIT License](./LICENSE), except Pairdraw Cloud, which is licensed under the [Apache License 2.0](./LICENSES/Apache-2.0.txt). [`REUSE.toml`](./REUSE.toml) lists the exact paths.

Copyright (c) 2026 Danila Poyarkov and OpenPencil contributors.
