# Pairdraw vs Penpot: Architecture & Performance Comparison

Why compare? Pairdraw exists because closed design platforms control what's possible. Understanding architectural differences shows what an open, local-first alternative can do differently.

Other comparisons, kept to facts checked on 2026-11-25: [Pairdraw vs Paper](/overview/comparison-paper), [vs Figma](/overview/comparison-figma), [vs pen.dev](/overview/comparison-pen-dev). The ground rules behind them are on [Open by design](/overview/open-by-design).

::: info Penpot's WASM renderer
Penpot 2.x includes a Rust/Skia WASM renderer (`render-wasm/v1`) that can be enabled via server flags or the `?wasm=true` URL parameter. The old SVG renderer remains the default. This page covers both.
:::

## 1. Scale & Codebase Size

| Metric           | Pairdraw                                                          | Penpot                                      |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| Total LOC        | **~437,000**                                                      | **~299,000**                                |
| Source files     | ~4,200                                                            | ~2,900                                      |
| Languages        | TypeScript, Vue, Rust                                             | Clojure, ClojureScript, Rust, JS, SQL, SCSS |
| Rendering engine | ~2,500 LOC (TS, 14 files in `packages/core/src/canvas/renderer/`) | 22,000 LOC (Rust/Skia WASM)                 |
| UI code          | ~173,000 LOC (`src/`)                                             | ~175,000 LOC (CLJS + SCSS)                  |
| Backend          | Optional Cloud server (TypeScript)                                | 32,600 LOC + 151 SQL files                  |
| LOC ratio        | **1.5×**                                                          | **1×**                                      |

Pairdraw's client is comparable in size to Penpot's, and it runs the whole editor in one process: no database, no service fleet, and an optional backend for teams that want one.

## 2. Architecture

### Pairdraw: Monolithic Client

```
┌─────────────────────────────────┐
│         Tauri (native shell)    │
│  ┌───────────────────────────┐  │
│  │  Vue 3 + TypeScript       │  │
│  │  ┌─────────┐ ┌──────────┐│  │
│  │  │  Editor  │ │  Kiwi    ││  │
│  │  │  Store   │ │  Codec   ││  │
│  │  └────┬─────┘ └──────────┘│  │
│  │       │                    │  │
│  │  ┌────▼────────────────┐  │  │
│  │  │  Scene Graph (TS)    │  │  │
│  │  │  Map<string, Node>   │  │  │
│  │  └────┬────────────────┘  │  │
│  │       │                    │  │
│  │  ┌────▼────┐ ┌──────────┐│  │
│  │  │  Skia   │ │  Yoga    ││  │
│  │  │CanvasKit│ │  Layout  ││  │
│  │  │  (WASM) │ │  (WASM)  ││  │
│  │  └─────────┘ └──────────┘│  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Everything in one process.** No server, no database, no Docker. The scene graph is a flat `Map<string, SceneNode>` in TypeScript. Rendering calls Skia CanvasKit directly from TS. Layout is Yoga WASM called synchronously.

### Penpot: Distributed Client-Server

```
┌───────────────────────────────────────────────────────┐
│                    Docker Compose                      │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │   Frontend    │  │   Backend   │  │   Exporter   │ │
│  │  ClojureScript│  │   Clojure   │  │  (Chromium)  │ │
│  │  shadow-cljs  │  │   JVM       │  │              │ │
│  │  ┌─────────┐ │  │  ┌────────┐ │  └──────────────┘ │
│  │  │render-  │ │  │  │Postgres│ │                    │
│  │  │wasm     │ │  │  │Valkey  │ │  ┌──────────────┐ │
│  │  │(Rust→   │ │  │  │ MinIO  │ │  │   MCP        │ │
│  │  │ Skia    │ │  │  └────────┘ │  │   Server     │ │
│  │  │ WASM)   │ │  │             │  └──────────────┘ │
│  │  └─────────┘ │  │             │                    │
│  └──────────────┘  └─────────────┘                    │
└───────────────────────────────────────────────────────┘
```

**5+ services minimum.** PostgreSQL for persistence, Redis (Valkey) for pub/sub and caching, MinIO for asset storage, a JVM backend, a Node.js exporter (headless Chromium for server-side rendering), plus the ClojureScript frontend. Dev setup requires Docker Compose with custom networking.

### Verdict: Architecture

Pairdraw's single-process architecture eliminates:

- Network latency between frontend and backend
- Serialization/deserialization overhead at service boundaries
- Container orchestration complexity
- Database query overhead for every operation

Penpot's architecture is optimized for **multi-user server-hosted deployments**. Pairdraw is optimized for **instant local performance**.

## 3. Rendering Pipeline

### Pairdraw: TS → CanvasKit WASM (direct)

```typescript
// renderer.ts — direct CanvasKit calls from TypeScript
renderSceneToCanvas(canvas, graph, pageId) {
  // Iterate nodes, build Skia paths/paints, draw
  this.fillPaint.setColor(...)
  canvas.drawRRect(rrect, this.fillPaint)
}
```

- **1 boundary crossing:** TS → WASM (CanvasKit)
- Scene graph lives in JS heap — no serialization to render
- ~2,500 LOC renderer, split into focused modules under `packages/core/src/canvas/renderer/`

### Penpot: JS (compiled from CLJS) → Rust WASM → Skia

Penpot 2.x includes a Rust/Skia WASM renderer (`render-wasm/v1`), opt-in via server flags or `?wasm=true`. When enabled, shapes are rendered through:

```
ClojureScript (compiled to JS)
  → decompose to primitives + binary-pack into WASM linear memory
  → Rust WASM (via Emscripten C FFI)
  → skia-safe (Rust Skia bindings)
  → Skia (WebGL)
```

When disabled (default), shapes render as an SVG DOM tree via React/Reagent — each shape is a DOM element.

- **1 boundary crossing** (JS → WASM), same as Pairdraw — but with explicit serialization overhead: UUIDs split to 4×u32, transforms to 6×f32, fills/strokes binary-packed, base props batched into a 104-byte struct per shape
- Tile-based rendering system with interest areas
- 11 separate render surfaces (fills, strokes, shadows, etc.)
- Global mutable state via `unsafe { STATE.as_mut() }` pattern
- 22,000 LOC Rust render engine

Penpot's tile system (`TileViewbox`, `TileTextureCache`, `TILE_SIZE_MULTIPLIER`) pre-renders tiles around the viewport and caches textures (up to 1024 entries).

Pairdraw re-renders the full viewport every frame because CanvasKit called directly from TS is fast enough to not need tiling.

### Verdict: Rendering

| Aspect             | Pairdraw              | Penpot                                     |
| ------------------ | --------------------- | ------------------------------------------ |
| JS→WASM boundary   | Direct (TS objects)   | Binary-packed (104-byte base props struct) |
| Rendering model    | Immediate/full redraw | Tile-cached                                |
| Surface management | 1 surface             | 11 surfaces                                |
| Memory overhead    | Low (no tile cache)   | High (1024 tile cache)                     |
| Code complexity    | ~2,500 LOC (14 files) | 22,000 LOC                                 |
| Unsafe code        | None                  | `unsafe` global state                      |

When Penpot's WASM renderer is enabled, both projects use Skia via JS→WASM. Pairdraw calls CanvasKit directly with TS objects. Penpot decomposes ClojureScript data into binary-packed structs, writes them to WASM linear memory, and renders through a 22,000 LOC Rust engine. When WASM is disabled (default), Penpot renders shapes as an SVG DOM tree. For small-to-medium documents, the direct CanvasKit path is faster. Penpot's tile system may win on extremely large canvases (100K+ shapes) where only a small viewport is visible — but the overhead is significant.

## 4. Scene Graph & Data Model

### **Pairdraw**

```typescript
// Flat map, O(1) lookup
nodes: Map<string, SceneNode>
// 64 node types in Figma's Kiwi schema; the engine builds 20
// NodeChange carries about 290 Figma-compatible fields
```

- TypeScript interfaces with strict types
- GUIDs match Figma's `sessionID:localID` format
- Direct property access — no indirection layers

### Penpot

```clojure
;; 20+ type definition files in common/src/app/common/types/
;; shapes_builder.cljc, shapes_helpers.cljc
;; Separate type systems for: color, component, container, fills,
;; grid, modifiers, objects_map, page, path, etc.
```

- Data spread across `common/` (49,600 LOC of .cljc)
- Separate geometry modules for flex layout (~6 files), grid layout (~5 files), constraints, bounds, corners, effects
- Runtime schema validation (Malli)
- Data must cross CLJS→Rust boundary for rendering

### Verdict: Data Model

Pairdraw reuses Figma's proven schema (605 Kiwi definitions) directly in TypeScript — zero translation. Penpot maintains its own type system across Clojure/ClojureScript/Rust, requiring manual sync between all three.

## 5. Layout Engine

### Pairdraw: Yoga WASM (314 LOC)

```typescript
import Yoga from 'yoga-layout'
// Direct mapping: Figma stack* fields → Yoga flex properties
const root = Yoga.Node.create()
root.setFlexDirection(FlexDirection.Row)
root.calculateLayout()
applyYogaLayout(graph, frame, yogaRoot)
```

314 lines total. Synchronous, in-process.

### Penpot: Dual Implementation

1. **ClojureScript** (common): `flex_layout/` (6 files), `grid_layout/` (5+ files) — custom implementations
2. **Rust WASM**: `flex_layout.rs` (741 LOC), `grid_layout.rs` (843 LOC) — reimplemented from scratch

Penpot maintains **two independent layout engines** (CLJS and Rust) that must produce identical results.

### Verdict: Layout

Pairdraw delegates to a battle-tested library (Yoga, used by React Native on billions of devices) in 314 lines. Penpot maintains ~3,000+ LOC of custom layout code duplicated across two languages.

## 6. File Format & Figma Compatibility

### **Pairdraw**

- **Native Kiwi binary format** — same serialization as Figma uses internally
- Direct `.fig` file import through the Kiwi codec (`packages/kiwi/src/fig/schema/fig.kiwi` for the schema, `codec.ts` for encode/decode)
- Figma clipboard paste support (reads Figma's Kiwi binary from the clipboard)
- Kiwi codec covers Figma's multiplayer message schema (Pairdraw does not connect to Figma's servers)

### Penpot

- **ZIP archive** (`.penpot` files) containing JSON manifests, per-file JSON data, binary assets, and thumbnails (v3 format)
- SVG used for default rendering and export (opt-in WASM renderer available)
- No native `.fig` import
- Three format versions (v1 legacy Transit, v2, v3 JSON-in-ZIP) with migration system

### Verdict: File Format

Pairdraw has a significant advantage — it can read Figma files natively and even paste Figma clipboard data. Penpot requires manual export/import and cannot open `.fig` files.

## 7. State Management & Undo

### **Pairdraw**

```typescript
// Inverse-command pattern (`packages/scene-graph/src/undo.ts`)
class UndoManager {
  apply(entry: UndoEntry) {
    entry.forward()
    this.undoStack.push(entry)
  }
  undo() {
    entry.inverse()
    this.redoStack.push(entry)
  }
}
```

Forward/inverse closures that capture minimal state. Batch support for multi-step operations.

### Penpot

State management uses Potok (a Redux-like library for ClojureScript atoms). Events implement `UpdateEvent` (pure state→state) or `WatchEvent` (side effects via RxJS). Undo stores inverse change vectors (max 50 entries), with transactions to group rapid changes and auto-expiry after 20 seconds.

### Verdict: State

Pairdraw's approach is simpler and lower overhead. Penpot's approach is more suitable for collaboration (changes are serializable), but at the cost of complexity.

## 8. Developer Experience

| Metric                     | Pairdraw                               | Penpot                                       |
| -------------------------- | -------------------------------------- | -------------------------------------------- |
| Dev setup                  | `bun install && bun dev`               | Docker Compose + JVM + Node + Rust toolchain |
| Hot reload                 | Vite HMR                               | shadow-cljs                                  |
| Type checking              | TypeScript (strict)                    | Runtime (Malli schemas)                      |
| Build                      | Vite and Cargo                         | JVM startup + CLJS compile + Rust WASM       |
| First contribution barrier | Low (TS/Vue)                           | High (Clojure + Rust + Docker)               |
| Desktop                    | Tauri v2 (macOS installer about 20 MB) | N/A (browser-only)                           |
| Hiring pool                | Massive (TS/Vue devs)                  | Tiny (ClojureScript + Rust)                  |

## 9. Performance Characteristics

These are structural differences, not benchmarks: neither editor has been measured side by side.

| Scenario           | Pairdraw                           | Penpot                                     |
| ------------------ | ---------------------------------- | ------------------------------------------ |
| Cold start         | Load the WASM modules              | Start the server, then the client and WASM |
| Operation path     | In-process                         | Network round trip to the backend          |
| Render frame       | Direct Skia call                   | CLJS→JS→WASM FFI→Skia                      |
| Processes to run   | One browser tab or the desktop app | JVM + Postgres + Valkey + browser          |
| Offline capability | Full (local-first)                 | None (server-dependent)                    |
| 10K shapes render  | One pass, no caching               | Tile-based with 11 surfaces                |

## 10. What Penpot Does Better

1. **Server-side collaboration** — centralized multi-user editing with WebSockets, user accounts, and access control, proven at scale (Pairdraw edits together only through an optional, self-hosted Pairdraw Cloud server, and has no peer-to-peer rooms)
2. **Plugin system** — full plugin API with sandboxed execution and an ecosystem of plugins (Pairdraw's plugins run one at a time, without network access)
3. **CSS Grid layout** — custom implementation (Pairdraw uses Yoga fork with grid support)
4. **Self-hosting** — Docker-based deployment for teams (Pairdraw Cloud is one Node process, and newer)
5. **Maturity** — years of production usage, battle-tested at scale

## 11. Scripting & Extensibility

Pairdraw ships with an [`eval` command](/programmable/cli/scripting) that provides a Figma-compatible Plugin API for headless scripting — batch operations, automated testing, and AI-driven modifications all run without the GUI. On top of that, **142 AI tools** are available via built-in chat, MCP server (stdio + HTTP), and the CLI — covering read, create, modify, structure, variables, vector path, analyze (color/typography/spacing/clusters), diff, boolean operations, and arrangement. Penpot has a plugin system with sandboxed execution but no headless scripting API or MCP integration.

## Summary

| Dimension                   | Winner       | Why                                                                                                                                        |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Architecture simplicity** | **Pairdraw** | Single process vs 5+ services                                                                                                              |
| **Rendering performance**   | **Pairdraw** | Direct CanvasKit vs SVG DOM (default) or binary-packed WASM                                                                                |
| **Code maintainability**    | **Pairdraw** | One process and one typed codebase vs services across 4+ languages                                                                         |
| **Figma compatibility**     | **Pairdraw** | Native Kiwi codec vs no .fig support                                                                                                       |
| **Developer onboarding**    | **Pairdraw** | TS/Vue vs Clojure/Rust/Docker                                                                                                              |
| **Desktop experience**      | **Pairdraw** | Tauri native vs browser-only                                                                                                               |
| **Layout engine**           | **Pairdraw** | Yoga (proven) vs custom dual implementation                                                                                                |
| **Collaboration**           | Penpot       | Both server-based with access control; Pairdraw's self-hosted Cloud server is optional and newer, and local documents have no live sharing |
| **Self-hosting**            | Penpot       | Docker-ready vs a newer single-process Cloud server                                                                                        |
| **Ecosystem maturity**      | Penpot       | Years of production vs early stage                                                                                                         |

Pairdraw is architecturally leaner — one process, a CanvasKit renderer in TypeScript, Figma-compatible by design. Penpot is a full-stack platform with ~299K LOC across Clojure, ClojureScript, Rust, and SCSS, plus a Docker service fleet. Both offer real-time collaboration through a server, which Pairdraw keeps optional. Penpot has a plugin ecosystem; **Pairdraw** has Figma-compatible headless scripting, **142 AI/MCP tools**, SVG and PDF export, and a native desktop app.
