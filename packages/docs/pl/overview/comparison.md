# Pairdraw i Penpot: architektura oraz wydajność

Po co porównywać? Pairdraw powstał, ponieważ zamknięte platformy projektowe decydują o tym, co jest możliwe. Zrozumienie różnic w architekturze pokazuje, co otwarta alternatywa działająca lokalnie może zrobić inaczej.

::: info Renderer WASM w Penpot
Penpot 2.x zawiera renderer Rust/Skia WASM `render-wasm/v1`, włączany opcjami serwera albo parametrem `?wasm=true`. Domyślnie nadal działa stary renderer SVG. Poniżej uwzględniono oba warianty.
:::

## 1. Skala i rozmiar bazy kodu

| Wskaźnik            | Pairdraw                                                                           | Penpot                                              |
| ------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| Wiersze kodu        | **około 437 000**                                                                  | **około 299 000**                                   |
| Pliki źródłowe      | około 4 200                                                                        | około 2 900                                         |
| Języki              | TypeScript, Vue, Rust                                                              | Clojure, ClojureScript, Rust, JavaScript, SQL, SCSS |
| Silnik renderowania | około 2 500 wierszy (TypeScript, 14 plików w `packages/core/src/canvas/renderer/`) | 22 000 wierszy (Rust/Skia WASM)                     |
| Interfejs           | około 173 000 wierszy (`src/`)                                                     | około 175 000 wierszy (CLJS i SCSS)                 |
| Część serwerowa     | Opcjonalny serwer Cloud (TypeScript)                                               | 32 600 wierszy i 151 plików SQL                     |
| Stosunek            | **1,5×**                                                                           | **1×**                                              |

Klient Pairdraw ma rozmiar zbliżony do klienta Penpota i mieści cały edytor w jednym procesie: bez bazy danych, bez floty usług i z opcjonalnym backendem dla zespołów, które go chcą.

## 2. Architektura

### Pairdraw: monolityczny klient

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

**Wszystko w jednym procesie.** Bez serwera, bazy danych i Dockera. SceneGraph to płaska mapa `Map<string, SceneNode>` w TypeScript. Renderowanie wywołuje Skia CanvasKit bezpośrednio z TypeScript, a układ oblicza synchronicznie Yoga WASM.

### Penpot: rozproszona architektura klient-serwer

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

**Co najmniej 5 usług.** PostgreSQL do przechowywania danych, Redis (Valkey) do pub/sub i pamięci podręcznej, MinIO do zasobów, część serwerowa na JVM, eksporter w Node.js (Chromium bez interfejsu do renderowania po stronie serwera) oraz interfejs w ClojureScript. Środowisko programistyczne wymaga Docker Compose z własną konfiguracją sieci.

### Werdykt: architektura

Architektura Pairdraw działająca w jednym procesie eliminuje:

- opóźnienia sieciowe między interfejsem a częścią serwerową;
- koszt serializacji i deserializacji na granicach usług;
- złożoność orkiestracji kontenerów;
- koszt zapytań do bazy danych przy każdej operacji.

Architektura Penpota jest zoptymalizowana pod **wieloosobowe wdrożenia hostowane na serwerze**. Pairdraw jest zoptymalizowany pod **natychmiastową wydajność lokalną**.

## 3. Potok renderowania

### Pairdraw: TypeScript → CanvasKit WASM (bezpośrednio)

```typescript
// renderer.ts — direct CanvasKit calls from TypeScript
renderSceneToCanvas(canvas, graph, pageId) {
  // Iterate nodes, build Skia paths/paints, draw
  this.fillPaint.setColor(...)
  canvas.drawRRect(rrect, this.fillPaint)
}
```

- **Jedno przejście granicy:** TypeScript → WASM (CanvasKit).
- SceneGraph pozostaje w pamięci JavaScript i nie jest serializowany przed renderowaniem.
- Renderer liczy około 2 500 wierszy podzielonych na wyspecjalizowane moduły w `packages/core/src/canvas/renderer/`

### Penpot: JS (skompilowany z CLJS) → Rust WASM → Skia

Penpot 2.x zawiera renderer Rust/Skia WASM `render-wasm/v1`, włączany opcjami serwera albo parametrem `?wasm=true`. Po jego włączeniu kształty są renderowane przez:

```
ClojureScript (compiled to JS)
  → decompose to primitives + binary-pack into WASM linear memory
  → Rust WASM (via Emscripten C FFI)
  → skia-safe (Rust Skia bindings)
  → Skia (WebGL)
```

Gdy renderer jest wyłączony (domyślnie), kształty są renderowane jako drzewo SVG DOM przez React/Reagent — każdy kształt to element DOM.

- **Jedno przejście granicy** (JS → WASM), tak jak w Pairdraw, ale z wyraźnym kosztem serializacji: identyfikatory UUID dzielone na 4×u32, transformacje na 6×f32, wypełnienia i obrysy pakowane binarnie, a podstawowe właściwości zbierane w 104-bajtową strukturę dla każdego kształtu.
- Renderowanie kafelkowe z obszarami zainteresowania.
- 11 osobnych powierzchni renderowania (wypełnienia, obrysy, cienie itd.).
- Globalny zmienny stan według wzorca `unsafe { STATE.as_mut() }`.
- Silnik renderowania w Rust liczący 22 000 wierszy.

System kafelków Penpota (`TileViewbox`, `TileTextureCache`, `TILE_SIZE_MULTIPLIER`) renderuje z wyprzedzeniem kafelki wokół widoku i przechowuje tekstury w pamięci podręcznej (do 1024 wpisów).

Pairdraw przerysowuje cały widok w każdej klatce, ponieważ CanvasKit wywoływany bezpośrednio z TypeScript jest na tyle szybki, że kafelki nie są potrzebne.

### Werdykt: renderowanie

| Aspekt                     | Pairdraw                            | Penpot                                                             |
| -------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| Granica JS → WASM          | Bezpośrednio (obiekty TypeScript)   | Pakowanie binarne (104-bajtowa struktura podstawowych właściwości) |
| Model renderowania         | Natychmiastowy, pełne przerysowanie | Pamięć podręczna kafelków                                          |
| Zarządzanie powierzchniami | 1 powierzchnia                      | 11 powierzchni                                                     |
| Narzut pamięci             | Niski (bez pamięci kafelków)        | Wysoki (pamięć 1024 kafelków)                                      |
| Złożoność kodu             | około 2 500 wierszy (14 plików)     | 22 000 wierszy                                                     |
| Kod niebezpieczny          | Brak                                | Stan globalny przez `unsafe`                                       |

Gdy renderer WASM Penpota jest włączony, oba projekty używają Skia przez JS → WASM. Pairdraw wywołuje CanvasKit bezpośrednio z obiektami TypeScript. Penpot rozkłada dane ClojureScript na binarnie spakowane struktury, zapisuje je w pamięci liniowej WASM i renderuje przez silnik Rust liczący 22 000 wierszy. Gdy WASM jest wyłączony (domyślnie), Penpot renderuje kształty jako drzewo SVG DOM. W małych i średnich dokumentach bezpośrednia ścieżka CanvasKit jest szybsza. System kafelków Penpota może wygrać na bardzo dużych obszarach roboczych (ponad 100 000 kształtów), gdy widoczny jest tylko niewielki fragment — ale jego narzut jest znaczny.

## 4. SceneGraph i model danych

### **Pairdraw**

```typescript
// Flat map, O(1) lookup
nodes: Map<string, SceneNode>
// 64 node types in Figma's Kiwi schema; the engine builds 20
// NodeChange carries about 290 Figma-compatible fields
```

- Interfejsy TypeScript ze ścisłymi typami.
- Identyfikatory GUID w formacie Figma `sessionID:localID`.
- Bezpośredni dostęp do właściwości — bez warstw pośrednich.

### Penpot

```clojure
;; 20+ type definition files in common/src/app/common/types/
;; shapes_builder.cljc, shapes_helpers.cljc
;; Separate type systems for: color, component, container, fills,
;; grid, modifiers, objects_map, page, path, etc.
```

- Dane rozłożone w katalogu `common/` (49 600 wierszy `.cljc`).
- Osobne moduły geometrii dla układu Flex (około 6 plików), układu Grid (około 5 plików), ograniczeń, granic, narożników i efektów.
- Sprawdzanie schematów podczas działania (Malli).
- Dane muszą przekroczyć granicę CLJS → Rust, aby zostały wyrenderowane.

### Werdykt: model danych

Pairdraw używa sprawdzonego schematu Figmy (605 definicje Kiwi) bezpośrednio w TypeScript — bez żadnego tłumaczenia. Penpot utrzymuje własny system typów w Clojure, ClojureScript i Rust, który trzeba ręcznie synchronizować między wszystkimi trzema językami.

## 5. Silnik układu

### Pairdraw: Yoga WASM (314 wierszy)

```typescript
import Yoga from 'yoga-layout'
// Direct mapping: Figma stack* fields → Yoga flex properties
const root = Yoga.Node.create()
root.setFlexDirection(FlexDirection.Row)
root.calculateLayout()
applyYogaLayout(graph, frame, yogaRoot)
```

Łącznie 314 wierszy. Synchronicznie, w tym samym procesie.

### Penpot: dwie implementacje

1. **ClojureScript** (`common`): `flex_layout/` (6 plików), `grid_layout/` (ponad 5 plików) — własne implementacje.
2. **Rust WASM**: `flex_layout.rs` (741 wierszy), `grid_layout.rs` (843 wiersze) — napisane od nowa.

Penpot utrzymuje **dwa niezależne silniki układu** (CLJS i Rust), które muszą dawać identyczne wyniki.

### Werdykt: układ

Pairdraw w 314 wierszach deleguje obliczenia do sprawdzonej biblioteki (Yoga, używanej przez React Native na miliardach urządzeń). Penpot utrzymuje ponad 3 000 wierszy własnego kodu układu, zduplikowanego w dwóch językach.

## 6. Format plików i zgodność z Figmą

### **Pairdraw**

- **Natywny binarny format Kiwi** — ta sama serializacja, której Figma używa wewnętrznie.
- Bezpośredni import plików `.fig` przez kodek Kiwi (schemat w `packages/kiwi/src/fig/schema/fig.kiwi`, kodowanie w `codec.ts`).
- Wklejanie ze schowka Figmy (odczyt binarnych danych Kiwi Figmy ze schowka).
- Kodek Kiwi obejmuje schemat wiadomości współpracy Figmy (Pairdraw nie łączy się z serwerami Figmy).

### Penpot

- **Archiwum ZIP** (pliki `.penpot`) z manifestami JSON, danymi JSON dla każdego pliku, zasobami binarnymi i miniaturami (format v3).
- SVG do domyślnego renderowania i eksportu (dostępny opcjonalny renderer WASM).
- Brak natywnego importu `.fig`.
- Trzy wersje formatu (v1 — starszy Transit, v2, v3 — JSON w ZIP) z systemem migracji.

### Werdykt: format plików

Pairdraw ma tu znaczną przewagę — natywnie odczytuje pliki Figmy, a nawet wkleja dane ze schowka Figmy. Penpot wymaga ręcznego eksportu i importu i nie otwiera plików `.fig`.

## 7. Zarządzanie stanem i cofanie

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

Domknięcia wykonania i cofnięcia przechowują minimalny stan. Obsługa partii dla operacji wieloetapowych.

### Penpot

Zarządzanie stanem korzysta z Potok (biblioteki podobnej do Redux dla atomów ClojureScript). Zdarzenia implementują `UpdateEvent` (czysta funkcja stan → stan) lub `WatchEvent` (skutki uboczne przez RxJS). Cofanie przechowuje odwrotne wektory zmian (maksymalnie 50 wpisów), z transakcjami grupującymi szybkie zmiany i automatycznym wygasaniem po 20 sekundach.

### Werdykt: stan

Podejście Pairdraw jest prostsze i ma mniejszy narzut. Podejście Penpota lepiej nadaje się do współpracy (zmiany można serializować), ale kosztem złożoności.

## 8. Wygoda programowania

| Wskaźnik                 | Pairdraw                                    | Penpot                                           |
| ------------------------ | ------------------------------------------- | ------------------------------------------------ |
| Przygotowanie środowiska | `bun install && bun dev`                    | Docker Compose, JVM, Node i zestaw narzędzi Rust |
| Szybkie odświeżanie      | Vite HMR                                    | shadow-cljs                                      |
| Sprawdzanie typów        | TypeScript (tryb ścisły)                    | Podczas działania (schematy Malli)               |
| Budowanie                | Vite i Cargo                                | Start JVM, kompilacja CLJS i Rust WASM           |
| Próg pierwszego wkładu   | Niski (TypeScript/Vue)                      | Wysoki (Clojure, Rust i Docker)                  |
| Aplikacja komputerowa    | Tauri v2 (instalator dla macOS około 20 MB) | Brak (tylko przeglądarka)                        |
| Dostępność programistów  | Ogromna (programiści TypeScript/Vue)        | Bardzo mała (ClojureScript i Rust)               |

## 9. Charakterystyka wydajności

To różnice w budowie, nie pomiary: żadnego z edytorów nie zmierzono obok drugiego.

| Scenariusz                    | Pairdraw                                          | Penpot                               |
| ----------------------------- | ------------------------------------------------- | ------------------------------------ |
| Zimny start                   | Wczytanie modułów WASM                            | Start serwera, potem klienta i WASM  |
| Droga operacji                | W tym samym procesie                              | Wymiana sieciowa z serwerem          |
| Klatka                        | Bezpośrednie wywołanie Skia                       | CLJS → JS → WASM FFI → Skia          |
| Uruchomione procesy           | Jedna karta przeglądarki lub aplikacja desktopowa | JVM, Postgres, Valkey i przeglądarka |
| Praca bez sieci               | Pełna (architektura lokalna)                      | Brak (zależność od serwera)          |
| Renderowanie 10 000 kształtów | Jedno przejście, bez pamięci podręcznej           | Kafelki i 11 powierzchni             |

## 10. W czym Penpot jest lepszy

1. **Współpraca po stronie serwera** — scentralizowana edycja wieloosobowa przez WebSockets, z kontami użytkowników i kontrolą dostępu, sprawdzona na dużą skalę (Pairdraw pozwala edytować wspólnie tylko przez opcjonalny, samodzielnie hostowany serwer Pairdraw Cloud i nie ma pokoi peer-to-peer).
2. **System wtyczek** — pełne API wtyczek z wykonaniem w izolacji i ekosystemem wtyczek (wtyczki Pairdraw działają pojedynczo i bez dostępu do sieci).
3. **Układ CSS Grid** — własna implementacja (Pairdraw używa odmiany Yoga z obsługą Grid).
4. **Samodzielne wdrożenie** — wdrożenie zespołowe oparte na Dockerze (Pairdraw Cloud to jeden proces Node i jest nowszy).
5. **Dojrzałość** — lata użycia produkcyjnego, sprawdzony na dużą skalę.

## 11. Skrypty i rozszerzanie

Pairdraw zawiera [polecenie `eval`](/pl/programmable/cli/scripting), które udostępnia API wtyczek zgodne z Figmą do skryptów bez interfejsu — operacje grupowe, automatyczne testy i zmiany wprowadzane przez AI działają bez GUI. Do tego **139 narzędzi AI** jest dostępnych przez wbudowany czat, serwer MCP (stdio i HTTP) oraz CLI — obejmują odczyt, tworzenie, modyfikację, strukturę, zmienne, ścieżki wektorowe, analizę (kolory, typografia, odstępy, powtarzające się struktury), różnice, operacje logiczne i rozmieszczanie. Penpot ma system wtyczek z wykonaniem w izolacji, ale nie ma API do skryptów bez interfejsu ani integracji MCP.

## Podsumowanie

| Obszar                            | Przewaga     | Powód                                                                                                                                                                  |
| --------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prostota architektury**         | **Pairdraw** | Jeden proces zamiast co najmniej 5 usług                                                                                                                               |
| **Wydajność renderowania**        | **Pairdraw** | Bezpośrednio CanvasKit zamiast SVG DOM (domyślnie) lub binarnie pakowanego WASM                                                                                        |
| **Łatwość utrzymania kodu**       | **Pairdraw** | Jeden proces i jedna typowana baza kodu zamiast usług w co najmniej 4 językach                                                                                         |
| **Zgodność z Figmą**              | **Pairdraw** | Natywny kodek Kiwi zamiast braku obsługi `.fig`                                                                                                                        |
| **Wdrożenie nowych programistów** | **Pairdraw** | TypeScript/Vue zamiast Clojure/Rust/Docker                                                                                                                             |
| **Aplikacja komputerowa**         | **Pairdraw** | Natywne Tauri zamiast tylko przeglądarki                                                                                                                               |
| **Silnik układu**                 | **Pairdraw** | Sprawdzona Yoga zamiast dwóch własnych implementacji                                                                                                                   |
| **Współpraca**                    | Penpot       | Oba oparte na serwerze z kontrolą dostępu; samodzielnie hostowany serwer Cloud w Pairdraw jest opcjonalny i nowszy, a dokumenty lokalne nie mają udostępniania na żywo |
| **Samodzielne wdrożenie**         | Penpot       | Gotowy do Dockera zamiast nowszego serwera Cloud działającego w jednym procesie                                                                                        |
| **Dojrzałość ekosystemu**         | Penpot       | Lata użycia produkcyjnego zamiast wczesnego etapu rozwoju                                                                                                              |

Pairdraw ma oszczędniejszą architekturę — renderer CanvasKit działający w jednym procesie, TypeScript i zgodność z Figmą od podstaw. Penpot to pełna platforma z około 299 tys. wierszy w Clojure, ClojureScript, Rust i SCSS oraz flotą usług Docker. Oba oferują współpracę w czasie rzeczywistym przez serwer, który w Pairdraw jest opcjonalny. Penpot ma ekosystem wtyczek; **Pairdraw** ma skrypty bez interfejsu zgodne z Figmą, **139 narzędzi AI/MCP**, eksport SVG i PDF oraz natywną aplikację na komputer.
