# Features

## Figma .fig Files

Open and save native Figma files directly. The import/export pipeline uses the same Kiwi binary codec as Figma — 605 schema definitions, ~590 fields per node. Save with <kbd>⌘</kbd><kbd>S</kbd>, Save As with <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>.

**Copy & paste with Figma** — select nodes in Figma, <kbd>⌘</kbd><kbd>C</kbd>, switch to Pairdraw, <kbd>⌘</kbd><kbd>V</kbd>. Fills, strokes, auto-layout, text, effects, corner radii, and vector networks are preserved. Works both ways.

## Drawing & Editing

- **Shapes** — Rectangle (<kbd>R</kbd>), Ellipse (<kbd>O</kbd>), Line (<kbd>L</kbd>), Polygon, Star
- **Pen tool** — vector networks (not simple paths), bezier curves with tangent handles
- **Pencil** (<kbd>⇧</kbd><kbd>P</kbd>) — freehand strokes smoothed into editable curves
- **Text** — canvas-native editing with IME support, double-click to enter edit mode
- **Rich text** — per-character bold (<kbd>⌘</kbd><kbd>B</kbd>), italic (<kbd>⌘</kbd><kbd>I</kbd>), underline (<kbd>⌘</kbd><kbd>U</kbd>), strikethrough
- **Auto-layout** — flexbox and CSS Grid via Yoga WASM: direction, gap, padding, justify, align, child sizing, grid tracks. <kbd>⇧</kbd><kbd>A</kbd> to toggle
- **Components** — create (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd>), component sets, instances with override support, slots, live sync
- **Behaviours and preview** — make components work as Reka UI controls (switch, slider, tabs, text field, accordion, …) and try them live over the canvas with <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> ([Components](/user-guide/components#behaviours-and-preview))
- **Script layers** — a layer's contents drawn by a JavaScript program stored in the document, with `@input` controls you can bind to variables, a live re-run when the code, inputs, or size change, and one step to convert the result into ordinary layers ([Script layers](/user-guide/script-layers))
- **Prototypes** — click or after-delay interactions on a layer that navigate to a frame, open or close an overlay, or go back, played on the canvas with instant or dissolve transitions ([Playing a prototype](/user-guide/playing-a-prototype))
- **Variables** — design tokens with collections, modes (Light/Dark), color/float/string/boolean types, variable binding
- **Sections** — organizational containers with auto-adopting children and title pills

## Editor Layout

The editor opens on the canvas alone. The tools stand at the canvas's left, with the layers panel's toggle above them, and the zoom sits in the bottom right corner. The sidebar's tabs show Layers, Assets, Slides, and Design; the Design tab holds the properties panel, which follows the selection but never opens itself. While the AI chat is closed, a prompt at the bottom of the canvas sends what you write to it. The app starts in the dark theme; **Settings → General → Theme** also offers Light and Auto.

- **Find layers** — <kbd>⌘</kbd><kbd>F</kbd> searches the shown page's layers by name, selects the one you pick, and brings it into view
- **Goodies** — the gift button in the top bar gathers things to start from: styles to pin to the AI chat, design systems to enable, scripts placed as code layers, and ready-made shaders

## Properties Panel

Context-sensitive Design and Code tabs, with Lint beside them:

- **Appearance** — opacity, corner radius (uniform or per-corner), visibility
- **Fill** — solid, gradient (linear/radial/angular/diamond/mesh), image
- **Stroke** — color, weight, align (inside/center/outside), per-side weights, cap, join, dash
- **Effects** — drop shadow, inner shadow, layer blur, background blur, foreground blur
- **Typography** — font picker with virtual scroll and search, weight, size, alignment, style buttons
- **Layout** — auto-layout controls when enabled
- **Export** — scale, format (PNG, JPG, WEBP, SVG, PDF, HTML), quality, live preview
- **Code** — Design JSX, HTML, and Vue and React components for the selection, styled with CSS or Tailwind, with live two-way Design JSX editing that patches your code as layers change; the element around the cursor outlines its layer on the canvas, and design issues are underlined on the property that causes them
- **Lint** — live design lint for the page or selection: low contrast, small touch targets, unbound colors, off-scale spacing, checked while the tab is open, with one-click variable binding ([Checking Designs](/user-guide/checking-designs))

## Rendering

Skia (CanvasKit WASM) — the same rendering engine as Figma:

- Gradient fills (linear, radial, angular, diamond)
- Image fills with scale modes
- Effects with per-node caching
- Arc data (partial ellipses, donuts)
- Viewport culling and paint reuse
- Snap guides with rotation-aware alignment
- Canvas rulers with selection badges
- Hover highlight that follows actual geometry

## Undo/Redo

Every operation is undoable — creation, deletion, moves, resizes, property changes, reparenting, layout changes, variable operations. Uses an inverse-command pattern. <kbd>⌘</kbd><kbd>Z</kbd> / <kbd>⇧</kbd><kbd>⌘</kbd><kbd>Z</kbd>.

## Multi-Page Documents

Add, delete, rename pages. Each page has independent viewport state. Double-click to rename inline.

## Multi-File Tabs

Open multiple documents in tabs. <kbd>⌘</kbd><kbd>T</kbd> new tab, <kbd>⌘</kbd><kbd>W</kbd> close, <kbd>⌘</kbd><kbd>O</kbd> open file.

## Export

- **Image** — PNG, JPG, WEBP at configurable scale (0.5×–4×). Via panel, context menu, or <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd>
- **SVG** — shapes, text with style runs, gradients, effects, blend modes
- **PDF** — one layer per page, or **File → Export Frames to PDF…** for the page's frames
- **HTML** — a page or fragment with plain CSS or Tailwind classes
- **Tailwind JSX** — HTML with Tailwind v4 utility classes, ready for React or Vue
- **Copy as** — text, SVG, PNG (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd>), or JSX via context menu

CLI: `pairdraw export design.fig -f jsx --style tailwind`

## AI Chat

Press <kbd>⌘</kbd><kbd>J</kbd> to open the AI assistant in its own column beside the canvas, or write in the prompt at the bottom of the canvas or on Home. With no model set up, the chat uses a coding agent already installed on this computer: Claude Code, Codex, Gemini CLI, or omp. 139 tools can create shapes, set styles, manage layout, work with components and variables, run boolean operations, analyze design tokens, and export assets. Connect Anthropic, OpenAI, Google AI, OpenRouter, any compatible endpoint, or the AI your [Pairdraw Cloud](/user-guide/pairdraw-cloud#ai-on-cloud) server offers. Each provider, model, and agent shows its maker's logo.

Tool calls display as collapsible timeline entries. Visual verification — the assistant renders its work and checks it against your request. Full undo support for all AI mutations.

You can watch an agent draw: each layer it adds traces in, one after another, the frames it works in shimmer, and a notice counts what it added and changed once it stops. **Animate AI edits** in Settings turns this off ([Watching the assistant draw](/programmable/ai-chat#watching-the-assistant-draw)).

See [AI Chat](/programmable/ai-chat) for setup and provider details.

## Built-in Browser

Open `http` and `https` pages in their own desktop window, which shares nothing with the editor, and bring them onto the canvas: import the whole page or one picked element as layers, or place a screenshot of the view, the page, or an element. The chat can read the page, mark an element in its reply, and click, type, press a key, scroll, or wait on it, asking first when Settings asks before changes.

On a board you already have, the same browser becomes research: the chat quotes the page into a sticky note that keeps its address, title, quote, and read time ([Research on a board](/user-guide/research)). Pairdraw does not create new boards.

## MCP Server

Connect Claude Code, Cursor, Windsurf, or any MCP client to read and write `.fig` files headlessly. 139 tools. Two transports: stdio and HTTP.

```sh
npm install -g @pairdraw/mcp
```

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

See [MCP Tools reference](/programmable/mcp-server) for the full tool list.

## CLI

Inspect, export, and analyze `.fig` files from the terminal:

```sh
pairdraw tree design.fig          # Node tree
pairdraw find design.fig --type TEXT  # Search
pairdraw export design.fig -f png     # Render
pairdraw analyze colors design.fig    # Color audit
pairdraw analyze clusters design.fig  # Repeated patterns
pairdraw eval design.fig -c "..."     # Figma Plugin API
```

When the desktop app is running, omit the file to control the live editor via RPC:

```sh
pairdraw tree                     # Live document
pairdraw export -f png            # Screenshot canvas
```

All commands support `--json`. Install: `npm install -g @pairdraw/cli` (or `bun add -g @pairdraw/cli`).

## Collaboration

Pairdraw has no live peer-to-peer rooms: there is no Share link for a local document, no joining by room ID, and no voice call. Documents on a [Pairdraw Cloud](/user-guide/pairdraw-cloud) server share through that server, and everyone who opens one edits it live.

- Live cursors with colored arrows and name pills, for people in a Cloud document and for AI agents
- Presence avatars; your own shows in the top bar only while it lists your AI agents or someone else has the Cloud document open
- Follow mode — click a person or an agent to follow their viewport
- **View → Multiplayer cursors** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) hides and shows the cursors

## Desktop & Web

**Desktop** — Tauri v2, with a macOS installer of about 20 MB. Release builds are published for macOS on Apple Silicon; Windows, Linux, and Intel Macs build from source. Native menus, offline, autosave.

**Web** — runs in the browser from your own build (`bun run dev`, or a deployment you host) or a Pairdraw Cloud server; there is no hosted copy. Installable as a PWA on mobile with touch-optimized UI.

**VS Code** — a custom editor for `.fig` and `.pen` documents that runs the web editor in a webview and saves what it shows; it is not published to a marketplace, so build it from the repository ([VS Code extension](/programmable/vscode)).

## Plugins

Install plugin manifests in **Settings → App → Plugins** and run a plugin's command from the command palette, where it works on the open document after asking what it may do. One plugin runs at a time, and network access is refused ([Plugins](/user-guide/plugins)).

## Google Fonts Fallback

When a font isn't available locally, Pairdraw fetches it from Google Fonts automatically. No manual installation needed when opening .fig files with unfamiliar fonts.
