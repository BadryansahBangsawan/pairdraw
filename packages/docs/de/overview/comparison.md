# Pairdraw und Penpot: Architektur und Leistung im Vergleich

Warum ein Vergleich? Pairdraw gibt es, weil geschlossene Designplattformen bestimmen, was möglich ist. Die Unterschiede in der Architektur zeigen, was eine offene, lokal arbeitende Alternative anders machen kann.

::: info WASM-Renderer in Penpot
Penpot 2.x enthält einen Rust/Skia-WASM-Renderer (`render-wasm/v1`), der sich über Serveroptionen oder den URL-Parameter `?wasm=true` aktivieren lässt. Standardmäßig bleibt der alte SVG-Renderer im Einsatz. Diese Seite behandelt beide.
:::

## 1. Umfang der Codebasis

| Metrik                    | Pairdraw                                                                   | Penpot                                      |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| Codezeilen gesamt         | **rund 437.000**                                                           | **rund 299.000**                            |
| Quelldateien              | rund 4.200                                                                 | rund 2.900                                  |
| Sprachen                  | TypeScript, Vue, Rust                                                      | Clojure, ClojureScript, Rust, JS, SQL, SCSS |
| Render-Engine             | rund 2.500 Zeilen (TS, 14 Dateien in `packages/core/src/canvas/renderer/`) | 22.000 Zeilen (Rust/Skia WASM)              |
| Oberflächencode           | rund 173.000 Zeilen (`src/`)                                               | rund 175.000 Zeilen (CLJS und SCSS)         |
| Serverseite               | Optionaler Cloud-Server (TypeScript)                                       | 32.600 Zeilen und 151 SQL-Dateien           |
| Verhältnis der Codezeilen | **1,5×**                                                                   | **1×**                                      |

Der Pairdraw-Client ist ähnlich groß wie der von Penpot und bringt den ganzen Editor in einem Prozess unter: keine Datenbank, keine Dienstflotte und ein optionales Backend für Teams, die eines wollen.

## 2. Architektur

### Pairdraw: monolithischer Client

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

**Alles in einem Prozess.** Kein Server, keine Datenbank, kein Docker. Der SceneGraph ist eine flache `Map<string, SceneNode>` in TypeScript. Das Rendering ruft Skia CanvasKit direkt aus TypeScript auf, und das Layout übernimmt Yoga WASM synchron.

### Penpot: verteilte Client-Server-Plattform

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

**Mindestens fünf Dienste.** PostgreSQL für die Speicherung, Redis (Valkey) für Pub/Sub und Caching, MinIO für Assets, eine JVM-Serverseite, ein Node.js-Exportdienst (Chromium ohne Oberfläche für serverseitiges Rendering) und dazu die ClojureScript-Oberfläche. Die Entwicklungsumgebung benötigt Docker Compose mit eigener Netzwerkkonfiguration.

### Fazit: Architektur

Die Architektur von Pairdraw mit einem einzigen Prozess beseitigt:

- Netzwerklatenz zwischen Oberfläche und Serverseite
- Aufwand für Serialisierung und Deserialisierung an Dienstgrenzen
- die Komplexität der Container-Orchestrierung
- Datenbankabfragen bei jeder Operation

Penpots Architektur ist auf **serverseitig gehostete Mehrbenutzerumgebungen** ausgelegt. Pairdraw ist auf **sofortige lokale Leistung** ausgelegt.

## 3. Renderablauf

### Pairdraw: TS → CanvasKit WASM (direkt)

```typescript
// renderer.ts — direct CanvasKit calls from TypeScript
renderSceneToCanvas(canvas, graph, pageId) {
  // Iterate nodes, build Skia paths/paints, draw
  this.fillPaint.setColor(...)
  canvas.drawRRect(rrect, this.fillPaint)
}
```

- **Ein Grenzübergang:** TS → WASM (CanvasKit)
- Der SceneGraph liegt im JavaScript-Heap und wird für das Rendering nicht serialisiert
- Renderer mit rund 2.500 Zeilen, aufgeteilt in spezialisierte Module unter `packages/core/src/canvas/renderer/`

### Penpot: JS (aus CLJS kompiliert) → Rust WASM → Skia

Penpot 2.x enthält einen Rust/Skia-WASM-Renderer (`render-wasm/v1`), der über Serveroptionen oder `?wasm=true` aktiviert wird. Ist er aktiv, durchlaufen Formen diesen Weg:

```
ClojureScript (compiled to JS)
  → decompose to primitives + binary-pack into WASM linear memory
  → Rust WASM (via Emscripten C FFI)
  → skia-safe (Rust Skia bindings)
  → Skia (WebGL)
```

Ist er deaktiviert (Standard), werden Formen als SVG-DOM-Baum über React/Reagent gerendert; jede Form ist ein DOM-Element.

- **Ein Grenzübergang** (JS → WASM) wie bei Pairdraw, aber mit ausdrücklichem Serialisierungsaufwand: UUIDs werden in 4×u32 zerlegt, Transformationen in 6×f32, Füllungen und Konturen binär gepackt, Grundeigenschaften in einer 104-Byte-Struktur pro Form gebündelt
- Kachelbasiertes Rendering mit Interessenbereichen
- 11 getrennte Renderflächen (Füllungen, Konturen, Schatten usw.)
- Globaler veränderlicher Zustand über das Muster `unsafe { STATE.as_mut() }`
- Render-Engine in Rust mit 22.000 Zeilen

Penpots Kachelsystem (`TileViewbox`, `TileTextureCache`, `TILE_SIZE_MULTIPLIER`) rendert Kacheln um den sichtbaren Bereich vorab und speichert Texturen zwischen (bis zu 1.024 Einträge).

Pairdraw rendert in jedem Frame den gesamten sichtbaren Bereich neu, weil CanvasKit direkt aus TypeScript aufgerufen schnell genug ist, um ohne Kacheln auszukommen.

### Fazit: Rendering

| Aspekt                       | Pairdraw                              | Penpot                                                   |
| ---------------------------- | ------------------------------------- | -------------------------------------------------------- |
| Grenze JS→WASM               | Direkt (TS-Objekte)                   | Binär gepackt (104-Byte-Struktur für Grundeigenschaften) |
| Rendermodell                 | Sofortiges, vollständiges Neuzeichnen | Kachel-Cache                                             |
| Verwaltung der Renderflächen | 1 Fläche                              | 11 Flächen                                               |
| Speicheraufwand              | Gering (kein Kachel-Cache)            | Hoch (Cache mit 1.024 Kacheln)                           |
| Codekomplexität              | rund 2.500 Zeilen (14 Dateien)        | 22.000 Zeilen                                            |
| Unsicherer Code              | Keiner                                | Globaler Zustand über `unsafe`                           |

Ist Penpots WASM-Renderer aktiv, nutzen beide Projekte Skia über JS→WASM. Pairdraw ruft CanvasKit direkt mit TS-Objekten auf. Penpot zerlegt ClojureScript-Daten in binär gepackte Strukturen, schreibt sie in den linearen WASM-Speicher und rendert über eine Rust-Engine mit 22.000 Zeilen. Ist WASM deaktiviert (Standard), rendert Penpot Formen als SVG-DOM-Baum. Bei kleinen bis mittelgroßen Dokumenten ist der direkte CanvasKit-Weg schneller. Penpots Kachelsystem kann bei extrem großen Arbeitsflächen (über 100.000 Formen) im Vorteil sein, wenn nur ein kleiner Ausschnitt sichtbar ist, doch der Aufwand ist erheblich.

## 4. SceneGraph und Datenmodell

### **Pairdraw**

```typescript
// Flat map, O(1) lookup
nodes: Map<string, SceneNode>
// 64 node types in Figma's Kiwi schema; the engine builds 20
// NodeChange carries about 290 Figma-compatible fields
```

- TypeScript-Interfaces mit strikten Typen
- GUIDs im Figma-Format `sessionID:localID`
- Direkter Zugriff auf Eigenschaften, ohne Zwischenschichten

### Penpot

```clojure
;; 20+ type definition files in common/src/app/common/types/
;; shapes_builder.cljc, shapes_helpers.cljc
;; Separate type systems for: color, component, container, fills,
;; grid, modifiers, objects_map, page, path, etc.
```

- Daten verteilt über `common/` (49.600 Zeilen `.cljc`)
- Eigene Geometriemodule für Flex-Layout (rund 6 Dateien), Grid-Layout (rund 5 Dateien), Constraints, Begrenzungen, Ecken und Effekte
- Schemavalidierung zur Laufzeit (Malli)
- Daten müssen für das Rendering die Grenze von CLJS zu Rust überqueren

### Fazit: Datenmodell

Pairdraw übernimmt Figmas bewährtes Schema (605 Kiwi-Definitionen) direkt in TypeScript, ganz ohne Übersetzung. Penpot pflegt ein eigenes Typsystem über Clojure, ClojureScript und Rust hinweg, das zwischen allen drei Sprachen von Hand synchron gehalten werden muss.

## 5. Layout-Engine

### Pairdraw: Yoga WASM (314 Zeilen)

```typescript
import Yoga from 'yoga-layout'
// Direct mapping: Figma stack* fields → Yoga flex properties
const root = Yoga.Node.create()
root.setFlexDirection(FlexDirection.Row)
root.calculateLayout()
applyYogaLayout(graph, frame, yogaRoot)
```

Insgesamt 314 Zeilen. Synchron, im selben Prozess.

### Penpot: doppelte Implementierung

1. **ClojureScript** (common): `flex_layout/` (6 Dateien), `grid_layout/` (5+ Dateien), eigene Implementierungen
2. **Rust WASM**: `flex_layout.rs` (741 Zeilen), `grid_layout.rs` (843 Zeilen), von Grund auf neu implementiert

Penpot pflegt **zwei unabhängige Layout-Engines** (CLJS und Rust), die identische Ergebnisse liefern müssen.

### Fazit: Layout

Pairdraw überlässt das Layout in 314 Zeilen einer erprobten Bibliothek (Yoga, das React Native auf Milliarden Geräten nutzt). Penpot pflegt über 3.000 Zeilen eigenen Layoutcode, doppelt in zwei Sprachen.

## 6. Dateiformat und Figma-Kompatibilität

### **Pairdraw**

- **Natives Kiwi-Binärformat**, dieselbe Serialisierung, die Figma intern verwendet
- Direkter Import von `.fig`-Dateien über den Kiwi-Codec (Schema in `packages/kiwi/src/fig/schema/fig.kiwi`, Kodierung in `codec.ts`)
- Einfügen aus der Figma-Zwischenablage (liest Figmas Kiwi-Binärdaten aus der Zwischenablage)
- Der Kiwi-Codec deckt Figmas Multiplayer-Nachrichtenschema ab (Pairdraw verbindet sich nicht mit Figmas Servern)

### Penpot

- **ZIP-Archiv** (`.penpot`-Dateien) mit JSON-Manifesten, JSON-Daten pro Datei, binären Assets und Vorschaubildern (Format v3)
- SVG für das Standard-Rendering und den Export (optionaler WASM-Renderer verfügbar)
- Kein nativer `.fig`-Import
- Drei Formatversionen (v1 mit veraltetem Transit, v2, v3 mit JSON in ZIP) mit Migrationssystem

### Fazit: Dateiformat

Pairdraw hat hier einen deutlichen Vorteil: Es liest Figma-Dateien nativ und fügt sogar Daten aus der Figma-Zwischenablage ein. Penpot erfordert manuellen Export und Import und kann `.fig`-Dateien nicht öffnen.

## 7. Zustandsverwaltung und Rückgängig

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

Vorwärts- und Umkehr-Closures, die nur den nötigsten Zustand festhalten. Batch-Unterstützung für mehrstufige Vorgänge.

### Penpot

Die Zustandsverwaltung nutzt Potok (eine Redux-ähnliche Bibliothek für ClojureScript-Atome). Ereignisse implementieren `UpdateEvent` (reine Zustandsübergänge) oder `WatchEvent` (Nebenwirkungen über RxJS). Rückgängig speichert inverse Änderungsvektoren (höchstens 50 Einträge), fasst schnelle Änderungen in Transaktionen zusammen und lässt sie nach 20 Sekunden automatisch ablaufen.

### Fazit: Zustand

Pairdraws Ansatz ist einfacher und verursacht weniger Aufwand. Penpots Ansatz eignet sich besser für Zusammenarbeit (Änderungen sind serialisierbar), allerdings auf Kosten der Komplexität.

## 8. Entwicklererfahrung

| Metrik                       | Pairdraw                              | Penpot                                       |
| ---------------------------- | ------------------------------------- | -------------------------------------------- |
| Einrichtung                  | `bun install && bun dev`              | Docker Compose, JVM, Node und Rust-Toolchain |
| Hot Reload                   | Vite HMR                              | shadow-cljs                                  |
| Typprüfung                   | TypeScript (strikt)                   | Zur Laufzeit (Malli-Schemas)                 |
| Build                        | Vite und Cargo                        | JVM-Start, CLJS-Kompilierung, Rust WASM      |
| Hürde für den ersten Beitrag | Niedrig (TS/Vue)                      | Hoch (Clojure, Rust, Docker)                 |
| Desktop                      | Tauri v2 (macOS-Installer rund 20 MB) | Keine (nur Browser)                          |
| Bewerberpool                 | Riesig (TS/Vue-Entwickler)            | Winzig (ClojureScript und Rust)              |

## 9. Leistungsmerkmale

Das sind strukturelle Unterschiede, keine Benchmarks: Beide Editoren wurden nicht nebeneinander gemessen.

| Szenario                  | Pairdraw                             | Penpot                               |
| ------------------------- | ------------------------------------ | ------------------------------------ |
| Kaltstart                 | WASM-Module laden                    | Server starten, dann Client und WASM |
| Weg einer Operation       | Im Prozess                           | Netzwerk-Roundtrip zum Backend       |
| Render-Frame              | Direkter Skia-Aufruf                 | CLJS → JS → WASM-FFI → Skia          |
| Laufende Prozesse         | Ein Browser-Tab oder die Desktop-App | JVM, Postgres, Valkey und Browser    |
| Offlinefähigkeit          | Vollständig (lokal)                  | Keine (serverabhängig)               |
| Rendern von 10.000 Formen | Ein Durchgang, ohne Cache            | Kachelbasiert mit 11 Flächen         |

## 10. Was Penpot besser macht

1. **Serverseitige Zusammenarbeit:** zentrale Mehrbenutzerbearbeitung mit WebSockets, Benutzerkonten und Zugriffskontrolle, im großen Maßstab erprobt (Pairdraw bearbeitet gemeinsam nur über einen optionalen, selbst gehosteten Pairdraw-Cloud-Server und hat keine Peer-to-Peer-Räume)
2. **Plugin-System:** vollständige Plugin-API mit isolierter Ausführung und einem Ökosystem von Plugins (Pairdraws Plugins laufen einzeln und ohne Netzwerkzugriff)
3. **CSS-Grid-Layout:** eigene Implementierung (Pairdraw nutzt einen Yoga-Fork mit Grid-Unterstützung)
4. **Selbsthosting:** Docker-basierte Bereitstellung für Teams (Pairdraw Cloud ist ein einzelner Node-Prozess und jünger)
5. **Reife:** jahrelanger Produktionseinsatz, im großen Maßstab erprobt

## 11. Skripte und Erweiterbarkeit

Pairdraw bringt einen [`eval`-Befehl](/de/programmable/cli/scripting) mit, der eine Figma-kompatible Plugin-API für Skripte ohne Oberfläche bereitstellt: Stapeloperationen, automatisierte Tests und KI-gesteuerte Änderungen laufen ohne grafische Oberfläche. Dazu kommen **142 AI-Werkzeuge** über den integrierten Chat, den MCP-Server (stdio und HTTP) und die CLI. Sie decken Lesen, Erstellen, Ändern, Struktur, Variablen, Vektorpfade, Analyse (Farbe, Typografie, Abstände, Cluster), Vergleiche, boolesche Operationen und Anordnung ab. Penpot hat ein Plugin-System mit isolierter Ausführung, aber keine Skript-API ohne Oberfläche und keine MCP-Integration.

## Zusammenfassung

| Bereich                     | Vorteil      | Grund                                                                                                                                                           |
| --------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Einfache Architektur**    | **Pairdraw** | Ein Prozess statt mindestens fünf Diensten                                                                                                                      |
| **Renderleistung**          | **Pairdraw** | Direktes CanvasKit statt SVG-DOM (Standard) oder binär gepacktem WASM                                                                                           |
| **Wartbarkeit des Codes**   | **Pairdraw** | Ein Prozess und eine typisierte Codebasis statt Dienste in mindestens vier Sprachen                                                                             |
| **Figma-Kompatibilität**    | **Pairdraw** | Nativer Kiwi-Codec statt keiner `.fig`-Unterstützung                                                                                                            |
| **Einstieg für Entwickler** | **Pairdraw** | TS/Vue statt Clojure/Rust/Docker                                                                                                                                |
| **Desktop-Erlebnis**        | **Pairdraw** | Natives Tauri statt nur Browser                                                                                                                                 |
| **Layout-Engine**           | **Pairdraw** | Yoga (bewährt) statt eigener doppelter Implementierung                                                                                                          |
| **Zusammenarbeit**          | Penpot       | Beide serverbasiert mit Zugriffskontrolle; Pairdraws selbst gehosteter Cloud-Server ist optional und jünger, und lokale Dokumente lassen sich nicht live teilen |
| **Selbsthosting**           | Penpot       | Docker-fertig statt eines jüngeren Cloud-Servers mit einem Prozess                                                                                              |
| **Reife des Ökosystems**    | Penpot       | Jahrelanger Produktionseinsatz statt früher Phase                                                                                                               |

Pairdraw ist architektonisch schlanker: ein CanvasKit-Renderer in einem einzigen Prozess mit TypeScript, von Grund auf Figma-kompatibel. Penpot ist eine Full-Stack-Plattform mit rund 299.000 Zeilen in Clojure, ClojureScript, Rust und SCSS sowie einer Flotte von Docker-Diensten. Beide bieten Echtzeit-Zusammenarbeit über einen Server, die Pairdraw optional hält. Penpot hat ein Plugin-Ökosystem; **Pairdraw** hat Figma-kompatible Skripte ohne Oberfläche, **142 AI/MCP-Werkzeuge**, SVG- und PDF-Export und eine native Desktop-App.
