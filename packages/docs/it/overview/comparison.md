# Pairdraw e Penpot: architettura e prestazioni

Perché un confronto? Pairdraw esiste perché le piattaforme di design chiuse decidono cosa è possibile fare. Capire le differenze di architettura mostra cosa può fare diversamente un’alternativa aperta e locale.

::: info Motore WASM di Penpot
Penpot 2.x include il motore Rust/Skia WASM `render-wasm/v1`, attivabile tramite opzioni del server o il parametro URL `?wasm=true`. Il vecchio motore SVG rimane quello predefinito. Questa pagina considera entrambe le modalità.
:::

## 1. Dimensione del codice

| Metrica | Pairdraw | Penpot |
|---------|------------|--------|
| Righe di codice | **circa 26.000** | **circa 299.000** |
| File sorgente | circa 143 | circa 2.900 |
| Linguaggi | TypeScript, Vue | Clojure, ClojureScript, Rust, JavaScript, SQL, SCSS |
| Motore di rendering | circa 3.200 righe (TypeScript, 10 file) | 22.000 righe (Rust/Skia WASM) |
| Interfaccia | circa 4.500 righe | circa 175.000 righe (CLJS e SCSS) |
| Server | Nessuno (architettura locale) | 32.600 righe e 151 file SQL |
| Rapporto | **1×** | **circa 11×** |

Pairdraw è **circa undici volte più piccolo**, ed è proprio questo il punto. Non è una semplificazione: è un’architettura radicalmente diversa.

## 2. Architettura

### Pairdraw: un solo processo client

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

**Tutto in un solo processo.** Niente server, database o Docker. SceneGraph è una `Map<string, SceneNode>` piatta in TypeScript. Il rendering chiama Skia CanvasKit direttamente da TypeScript e la disposizione è calcolata da Yoga WASM in modo sincrono.

### Penpot: piattaforma client-server distribuita

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

**Almeno 5 servizi.** PostgreSQL per la persistenza, Redis (Valkey) per pub/sub e cache, MinIO per l’archiviazione delle risorse, un server JVM, un esportatore Node.js (Chromium senza interfaccia per il rendering lato server) e l’interfaccia ClojureScript. L’ambiente di sviluppo richiede Docker Compose con una rete personalizzata.

### Verdetto: architettura

L’architettura a processo unico di Pairdraw elimina:
- la latenza di rete tra interfaccia e server
- il costo di serializzazione e deserializzazione ai confini tra servizi
- la complessità dell’orchestrazione dei contenitori
- il costo di una query al database per ogni operazione

L’architettura di Penpot è ottimizzata per **installazioni multiutente ospitate su server**. Pairdraw è ottimizzato per **prestazioni locali immediate**.

## 3. Flusso di rendering

### Pairdraw: TypeScript → CanvasKit WASM (diretto)

```typescript
// renderer.ts — direct CanvasKit calls from TypeScript
renderSceneToCanvas(canvas, graph, pageId) {
  // Iterate nodes, build Skia paths/paints, draw
  this.fillPaint.setColor(...)
  canvas.drawRRect(rrect, this.fillPaint)
}
```

- **Un solo passaggio di confine:** TypeScript → WASM (CanvasKit)
- SceneGraph vive nell’heap JavaScript: nessuna serializzazione prima del rendering
- Motore di circa 3.200 righe, diviso in 10 file specializzati: scena, sovrapposizioni, riempimenti, contorni, forme, effetti, righelli, etichette

### Penpot: JavaScript (compilato da CLJS) → Rust WASM → Skia

Penpot 2.x include un motore Rust/Skia WASM (`render-wasm/v1`), da attivare tramite opzioni del server o `?wasm=true`. Quando è attivo, le forme vengono renderizzate così:

```
ClojureScript (compiled to JS)
  → decompose to primitives + binary-pack into WASM linear memory
  → Rust WASM (via Emscripten C FFI)
  → skia-safe (Rust Skia bindings)
  → Skia (WebGL)
```

Quando è disattivato (impostazione predefinita), le forme vengono renderizzate come albero SVG DOM tramite React/Reagent: ogni forma è un elemento DOM.

- **Un solo passaggio di confine** (JavaScript → WASM), come in Pairdraw, ma con un costo di serializzazione esplicito: UUID divisi in 4×u32, trasformazioni in 6×f32, riempimenti e contorni codificati in binario, proprietà di base raggruppate in una struttura di 104 byte per forma
- Sistema di rendering a riquadri con aree di interesse
- 11 superfici di rendering separate (riempimenti, contorni, ombre, ecc.)
- Stato globale mutabile tramite lo schema `unsafe { STATE.as_mut() }`
- Motore di rendering Rust di 22.000 righe

Il sistema a riquadri di Penpot (`TileViewbox`, `TileTextureCache`, `TILE_SIZE_MULTIPLIER`) pre-renderizza i riquadri attorno all’area visibile e mette in cache le texture (fino a 1.024 voci).

Pairdraw ridisegna l’intera area visibile a ogni fotogramma, perché CanvasKit chiamato direttamente da TypeScript è abbastanza veloce da non richiedere riquadri.

### Verdetto: rendering

| Aspetto | Pairdraw | Penpot |
|---------|------------|--------|
| Confine JavaScript → WASM | Diretto (oggetti TypeScript) | Codifica binaria (struttura di 104 byte per le proprietà di base) |
| Modello di rendering | Immediato, ridisegno completo | Cache a riquadri |
| Gestione delle superfici | 1 superficie | 11 superfici |
| Memoria aggiuntiva | Bassa (nessuna cache a riquadri) | Alta (cache di 1.024 riquadri) |
| Complessità del codice | circa 3.200 righe (10 file) | 22.000 righe |
| Codice non sicuro | Nessuno | Stato globale `unsafe` |

Con il motore WASM di Penpot attivo, entrambi i progetti usano Skia tramite JavaScript → WASM. Pairdraw chiama CanvasKit direttamente con oggetti TypeScript. Penpot scompone i dati ClojureScript in strutture binarie, le scrive nella memoria lineare WASM e renderizza tramite un motore Rust di 22.000 righe. Con WASM disattivato (impostazione predefinita), Penpot renderizza le forme come albero SVG DOM. Nei documenti piccoli e medi il percorso diretto di CanvasKit è più veloce. Il sistema a riquadri di Penpot può prevalere su aree di lavoro enormi (oltre 100.000 forme) di cui è visibile solo una piccola porzione, ma il costo aggiuntivo è notevole.

## 4. SceneGraph e modello dati

### **Pairdraw**

```typescript
// Flat map, O(1) lookup
nodes: Map<string, SceneNode>
// 29 node types from Figma's Kiwi schema
// ~390 fields per NodeChange (Figma-compatible)
```

- Interfacce TypeScript con tipi rigorosi
- GUID nello stesso formato `sessionID:localID` di Figma
- Accesso diretto alle proprietà, senza livelli di indirezione

### Penpot

```clojure
;; 20+ type definition files in common/src/app/common/types/
;; shapes_builder.cljc, shapes_helpers.cljc
;; Separate type systems for: color, component, container, fills,
;; grid, modifiers, objects_map, page, path, etc.
```

- Dati distribuiti in `common/` (49.600 righe di `.cljc`)
- Moduli geometrici separati per la disposizione flex (circa 6 file), la disposizione a griglia (circa 5 file), vincoli, limiti, angoli ed effetti
- Convalida degli schemi durante l’esecuzione (Malli)
- I dati devono attraversare il confine CLJS → Rust per il rendering

### Verdetto: modello dati

Pairdraw riusa direttamente in TypeScript lo schema collaudato di Figma (194 definizioni Kiwi), senza alcuna traduzione. Penpot mantiene un proprio sistema di tipi tra Clojure, ClojureScript e Rust, che va sincronizzato a mano in tutti e tre.

## 5. Motore di disposizione

### Pairdraw: Yoga WASM (314 righe)

```typescript
import Yoga from 'yoga-layout'
// Direct mapping: Figma stack* fields → Yoga flex properties
const root = Yoga.Node.create()
root.setFlexDirection(FlexDirection.Row)
root.calculateLayout()
applyYogaLayout(graph, frame, yogaRoot)
```

314 righe in tutto. Sincrono, nello stesso processo.

### Penpot: doppia implementazione

1. **ClojureScript** (common): `flex_layout/` (6 file), `grid_layout/` (oltre 5 file), implementazioni proprie
2. **Rust WASM**: `flex_layout.rs` (741 righe), `grid_layout.rs` (843 righe), riscritti da zero

Penpot mantiene **due motori di disposizione indipendenti** (CLJS e Rust) che devono produrre risultati identici.

### Verdetto: disposizione

Pairdraw delega a una libreria collaudata (Yoga, usata da React Native su miliardi di dispositivi) in 314 righe. Penpot mantiene oltre 3.000 righe di codice di disposizione proprio, duplicato in due linguaggi.

## 6. Formati e compatibilità con Figma

### **Pairdraw**

- **Formato binario Kiwi nativo**, la stessa serializzazione che Figma usa internamente
- Importazione diretta dei file `.fig` tramite il codec Kiwi estratto (schema di 2.178 righe e codec di 551 righe)
- Incolla dagli appunti di Figma (legge i dati binari Kiwi che Figma mette negli appunti)
- Il codec Kiwi copre lo schema dei messaggi multiplayer di Figma (Pairdraw non si collega ai server di Figma)

### Penpot

- **Archivio ZIP** (file `.penpot`) con manifesti JSON, dati JSON per file, risorse binarie e miniature (formato v3)
- SVG per il rendering e l’esportazione predefiniti (motore WASM disponibile su richiesta)
- Nessuna importazione nativa di `.fig`
- Tre versioni del formato (v1 Transit storico, v2, v3 JSON in ZIP) con un sistema di migrazione

### Verdetto: formato dei file

Pairdraw ha un vantaggio significativo: legge i file Figma in modo nativo e incolla persino i dati degli appunti di Figma. Penpot richiede esportazione e importazione manuali e non apre i file `.fig`.

## 7. Stato e annullamento

### **Pairdraw**

```typescript
// 110 LOC — inverse command pattern
class UndoManager {
  apply(entry: UndoEntry) { entry.forward(); this.undoStack.push(entry) }
  undo() { entry.inverse(); this.redoStack.push(entry) }
}
```

110 righe. Funzioni di applicazione e annullamento che conservano solo lo stato minimo necessario, con raggruppamento per le operazioni in più passaggi.

### Penpot

La gestione dello stato usa Potok (una libreria simile a Redux per gli atom ClojureScript). Gli eventi implementano `UpdateEvent` (funzione pura da stato a stato) o `WatchEvent` (effetti collaterali tramite RxJS). L’annullamento conserva vettori di modifiche inverse (fino a 50 voci), con transazioni che raggruppano le modifiche rapide e scadenza automatica dopo 20 secondi.

### Verdetto: stato

L’approccio di Pairdraw è più semplice e costa meno. Quello di Penpot si presta meglio alla collaborazione (le modifiche sono serializzabili), ma al prezzo di una maggiore complessità.

## 8. Esperienza di sviluppo

| Metrica | Pairdraw | Penpot |
|---------|------------|--------|
| Preparazione | `bun install && bun dev` | Docker Compose + JVM + Node + strumenti Rust |
| Aggiornamento rapido | Vite HMR (circa 50 ms) | shadow-cljs (secondi) |
| Controllo dei tipi | TypeScript (rigoroso) | Durante l’esecuzione (schemi Malli) |
| Tempo di compilazione | meno di 5 s (Vite) | Minuti (avvio JVM + compilazione CLJS + Rust WASM) |
| Barriera al primo contributo | Bassa (TypeScript/Vue) | Alta (Clojure + Rust + Docker) |
| Desktop | Tauri v2 (programma di installazione macOS di circa 20 MB) | Non disponibile (solo browser) |
| Bacino di sviluppatori | Enorme (sviluppatori TypeScript/Vue) | Minimo (ClojureScript + Rust) |

## 9. Prestazioni

| Scenario | Pairdraw | Penpot |
|----------|------------|--------|
| Avvio a freddo | meno di 2 s (caricamento WASM) | oltre 10 s (server + client + WASM) |
| Latenza di un’operazione | meno di 1 ms (nello stesso processo) | 10–50 ms (andata e ritorno di rete) |
| Fotogramma | Chiamata diretta a Skia | CLJS → JS → WASM FFI → Skia |
| Memoria di base | circa 50 MB (scheda del browser) | oltre 300 MB (JVM + Postgres + Valkey + browser) |
| Uso senza rete | Completo (architettura locale) | Nessuno (dipende dal server) |
| Rendering di 10.000 forme | Una passata, senza cache | A riquadri con 11 superfici |

## 10. Cosa fa meglio Penpot

1. **Collaborazione lato server:** modifica multiutente centralizzata con WebSocket, account utente e controllo degli accessi, collaudata su larga scala (Pairdraw permette di modificare insieme solo tramite un server Pairdraw Cloud facoltativo e ospitato in proprio, e non ha stanze peer-to-peer).
2. **Sistema di plugin:** API dei plugin completa con esecuzione isolata e un ecosistema di plugin (i plugin di Pairdraw vengono eseguiti uno alla volta, senza accesso alla rete).
3. **Disposizione CSS Grid:** implementazione propria (Pairdraw usa una variante di Yoga con supporto Grid).
4. **Installazione autonoma:** distribuzione per gruppi basata su Docker (Pairdraw Cloud è un unico processo Node, ed è più recente).
5. **Maturità:** anni di uso in produzione, collaudata su larga scala.

## 11. Script ed estensibilità

Pairdraw include il [comando `eval`](/programmable/cli/scripting), che fornisce un’API compatibile con i plugin Figma per script senza interfaccia: operazioni in serie, test automatizzati e modifiche guidate dall’AI funzionano tutti senza interfaccia grafica. In più, **più di 130 strumenti AI** sono disponibili tramite la chat integrata, il server MCP (stdio + HTTP) e la CLI, e coprono lettura, creazione, modifica, struttura, variabili, tracciati vettoriali, analisi (colori, tipografia, spaziatura, raggruppamenti), differenze, operazioni booleane e disposizione. Penpot ha un sistema di plugin con esecuzione isolata, ma nessuna API per script senza interfaccia né integrazione MCP.

## Riepilogo

| Area | Vantaggio | Motivo |
|------|-----------|--------|
| **Semplicità dell’architettura** | **Pairdraw** | Un solo processo contro almeno 5 servizi |
| **Prestazioni di rendering** | **Pairdraw** | CanvasKit diretto contro SVG DOM (predefinito) o WASM con codifica binaria |
| **Manutenibilità del codice** | **Pairdraw** | Circa 26.000 righe in un linguaggio contro 299.000 in oltre 4 linguaggi |
| **Compatibilità con Figma** | **Pairdraw** | Codec Kiwi nativo contro nessun supporto `.fig` |
| **Accesso per nuovi sviluppatori** | **Pairdraw** | TypeScript/Vue contro Clojure/Rust/Docker |
| **Esperienza desktop** | **Pairdraw** | Tauri nativo contro solo browser |
| **Motore di disposizione** | **Pairdraw** | Yoga (collaudato) contro una doppia implementazione propria |
| **Collaborazione** | **Penpot** | Entrambi basati su server con controllo degli accessi; il server Cloud di Pairdraw, ospitato in proprio, è facoltativo e più recente, e i documenti locali non hanno condivisione in tempo reale |
| **Installazione autonoma** | **Penpot** | Pronto per Docker contro un server Cloud a processo unico più recente |
| **Maturità dell’ecosistema** | **Penpot** | Anni di uso in produzione contro una fase iniziale |

Pairdraw è più snello nell’architettura: un motore CanvasKit in un solo processo, in circa 26.000 righe di TypeScript, compatibile con Figma per progetto. Penpot è una piattaforma completa con circa 299.000 righe tra Clojure, ClojureScript, Rust e SCSS, più una flotta di servizi Docker. Entrambi offrono collaborazione in tempo reale tramite un server, che in Pairdraw resta facoltativo. Penpot ha un ecosistema di plugin; **Pairdraw** ha script senza interfaccia compatibili con Figma, **più di 130 strumenti AI/MCP**, esportazione SVG e PDF e un’applicazione desktop nativa.
