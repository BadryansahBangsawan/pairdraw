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

## Properties Panel

Context-sensitive Design | Code | AI | Lint tabs:

- **Appearance** — opacity, corner radius (uniform or per-corner), visibility
- **Fill** — solid, gradient (linear/radial/angular/diamond/mesh), image
- **Stroke** — color, weight, align (inside/center/outside), per-side weights, cap, join, dash
- **Effects** — drop shadow, inner shadow, layer blur, background blur, foreground blur
- **Typography** — font picker with virtual scroll and search, weight, size, alignment, style buttons
- **Layout** — auto-layout controls when enabled
- **Export** — scale, format (PNG/JPG/WEBP/SVG), live preview
- **Code** — Design JSX, HTML, and Vue and React components for the selection, styled with CSS or Tailwind, with live two-way Design JSX editing that patches your code as layers change; the element around the cursor outlines its layer on the canvas, and design issues are underlined on the property that causes them
- **Lint** — live design lint for the page or selection: low contrast, small touch targets, unbound colors, off-scale spacing, with issue markers on the canvas and one-click variable binding ([Checking Designs](/user-guide/checking-designs))

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
- **Tailwind JSX** — HTML with Tailwind v4 utility classes, ready for React or Vue
- **Copy as** — text, SVG, PNG (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd>), or JSX via context menu

CLI: `openpencil export design.fig -f jsx --style tailwind`

## AI Chat

Press <kbd>⌘</kbd><kbd>J</kbd> to open the AI assistant. 138 tools that can create shapes, set styles, manage layout, work with components and variables, run boolean operations, analyze design tokens, and export assets. Connect Anthropic, OpenAI, Google AI, OpenRouter, any compatible endpoint, or the AI your [Pairdraw Cloud](/user-guide/openpencil-cloud#ai-on-cloud) plan includes.

Tool calls display as collapsible timeline entries. Visual verification — the assistant renders its work and checks it against your request. Full undo support for all AI mutations.

See [AI Chat](/programmable/ai-chat) for setup and provider details.

## Built-in Browser

Open `http` and `https` pages in their own desktop window, which shares nothing with the editor, and bring them onto the canvas: import the whole page or one picked element as layers, or place a screenshot of the view, the page, or an element. The chat can read the page, mark an element in its reply, and click, type, press a key, scroll, or wait on it, asking first when Settings asks before changes.

On a board, the same browser becomes research: the chat quotes the page into a sticky note that keeps its address, title, quote, and read time ([Research on a board](/user-guide/research)).

## MCP Server

Connect Claude Code, Cursor, Windsurf, or any MCP client to read and write `.fig` files headlessly. 138 tools. Two transports: stdio and HTTP.

```sh
npm install -g @open-pencil/mcp
```

```json
{
  "mcpServers": {
    "open-pencil": {
      "command": "openpencil-mcp"
    }
  }
}
```

See [MCP Tools reference](/programmable/mcp-server) for the full tool list.

## CLI

Inspect, export, and analyze `.fig` files from the terminal:

```sh
openpencil tree design.fig          # Node tree
openpencil find design.fig --type TEXT  # Search
openpencil export design.fig -f png     # Render
openpencil analyze colors design.fig    # Color audit
openpencil analyze clusters design.fig  # Repeated patterns
openpencil eval design.fig -c "..."     # Figma Plugin API
```

When the desktop app is running, omit the file to control the live editor via RPC:

```sh
openpencil tree                     # Live document
openpencil export -f png            # Screenshot canvas
```

All commands support `--json`. Install: `npm install -g @open-pencil/cli` (or `bun add -g @open-pencil/cli`).

## Real-Time Collaboration

P2P via WebRTC — no server required. Share a link and edit together.

- Live cursors with colored arrows and name pills
- Presence avatars
- Follow mode — click a peer to follow their viewport
- Voice calls — talk with the people in the room, peer to peer, with mute, microphone and speaker choice, and a ring on whoever is speaking
- Local persistence via IndexedDB
- Secure room IDs via `crypto.getRandomValues()`

## Desktop & Web

**Desktop** — Tauri v2, ~7 MB. macOS (signed & notarized), Windows, Linux. Native menus, offline, autosave.

**Web** — runs at [app.openpencil.dev](https://app.openpencil.dev), installable as a PWA on mobile with touch-optimized UI.

**Homebrew:**

```sh
brew install --cask openpencil
```

**VS Code** — a custom editor for `.fig` and `.pen` documents that runs the web editor in a webview and saves what it shows; it is not published to a marketplace, so build it from the repository ([VS Code extension](/programmable/vscode)).

## Plugins

Install plugin manifests in **Settings → App → Plugins** and run a plugin's command from the command palette, where it works on the open document after asking what it may do. One plugin runs at a time, and network access is refused ([Plugins](/user-guide/plugins)).

## Google Fonts Fallback

When a font isn't available locally, Pairdraw fetches it from Google Fonts automatically. No manual installation needed when opening .fig files with unfamiliar fonts.
