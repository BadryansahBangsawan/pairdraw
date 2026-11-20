# Pairdraw y Penpot: comparación de arquitectura y rendimiento

¿Por qué comparar? Pairdraw existe porque las plataformas de diseño cerradas controlan lo que es posible. Entender las diferencias de arquitectura muestra qué puede hacer de otro modo una alternativa abierta y local.

::: info Renderizador WASM de Penpot
Penpot 2.x incluye el renderizador Rust/Skia WASM `render-wasm/v1`, que se activa mediante opciones del servidor o el parámetro de URL `?wasm=true`. El antiguo renderizador SVG sigue siendo el predeterminado. Esta página tiene en cuenta ambos.
:::

## 1. Escala y tamaño del código

| Métrica              | Pairdraw                                                                    | Penpot                                      |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| Líneas de código     | **unas 437.000**                                                            | **unas 299.000**                            |
| Archivos fuente      | unos 4.200                                                                  | unos 2.900                                  |
| Lenguajes            | TypeScript, Vue, Rust                                                       | Clojure, ClojureScript, Rust, JS, SQL, SCSS |
| Motor de renderizado | unas 2.500 líneas (TS, 14 archivos en `packages/core/src/canvas/renderer/`) | 22.000 líneas (Rust/Skia WASM)              |
| Interfaz             | unas 173.000 líneas (`src/`)                                                | unas 175.000 líneas (CLJS y SCSS)           |
| Servidor             | Servidor Cloud opcional (TypeScript)                                        | 32.600 líneas y 151 archivos SQL            |
| Proporción de líneas | **1,5×**                                                                    | **1×**                                      |

El cliente de Pairdraw es de un tamaño parecido al de Penpot y ejecuta todo el editor en un solo proceso: sin base de datos, sin flota de servicios y con un backend opcional para los equipos que lo quieran.

## 2. Arquitectura

### Pairdraw: cliente monolítico

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

**Todo en un solo proceso.** Sin servidor, sin base de datos y sin Docker. El grafo de escena es un `Map<string, SceneNode>` plano en TypeScript. El renderizado llama a Skia CanvasKit directamente desde TS, y la disposición la calcula Yoga WASM de forma síncrona.

### Penpot: cliente-servidor distribuido

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

**Un mínimo de 5 servicios.** PostgreSQL para la persistencia, Redis (Valkey) para publicación/suscripción y caché, MinIO para almacenar recursos, un servidor JVM, un exportador Node.js (Chromium sin interfaz para renderizar en el servidor) y la interfaz en ClojureScript. El entorno de desarrollo requiere Docker Compose con una red personalizada.

### Veredicto: arquitectura

La arquitectura de un solo proceso de Pairdraw elimina:

- la latencia de red entre interfaz y servidor;
- el coste de serializar y deserializar en los límites entre servicios;
- la complejidad de orquestar contenedores;
- el coste de consultar la base de datos en cada operación.

La arquitectura de Penpot está optimizada para **despliegues multiusuario alojados en un servidor**. Pairdraw está optimizado para un **rendimiento local inmediato**.

## 3. Proceso de renderizado

### Pairdraw: TS → CanvasKit WASM (directo)

```typescript
// renderer.ts — direct CanvasKit calls from TypeScript
renderSceneToCanvas(canvas, graph, pageId) {
  // Iterate nodes, build Skia paths/paints, draw
  this.fillPaint.setColor(...)
  canvas.drawRRect(rrect, this.fillPaint)
}
```

- **1 cruce de límite:** TS → WASM (CanvasKit).
- El grafo de escena vive en el heap de JS; no hay que serializar nada para renderizar.
- Renderizador de unas 2.500 líneas, repartidas en módulos especializados en `packages/core/src/canvas/renderer/`

### Penpot: JS (compilado desde CLJS) → Rust WASM → Skia

Penpot 2.x incluye un renderizador Rust/Skia WASM (`render-wasm/v1`) que se activa mediante opciones del servidor o `?wasm=true`. Cuando está activado, las formas se renderizan así:

```
ClojureScript (compiled to JS)
  → decompose to primitives + binary-pack into WASM linear memory
  → Rust WASM (via Emscripten C FFI)
  → skia-safe (Rust Skia bindings)
  → Skia (WebGL)
```

Cuando está desactivado (lo predeterminado), las formas se renderizan como un árbol DOM de SVG mediante React/Reagent: cada forma es un elemento DOM.

- **1 cruce de límite** (JS → WASM), igual que en Pairdraw, pero con un coste de serialización explícito: los UUID se dividen en 4×u32, las transformaciones en 6×f32, los rellenos y contornos se empaquetan en binario y las propiedades básicas se agrupan en una estructura de 104 bytes por forma.
- Sistema de renderizado por teselas con áreas de interés.
- 11 superficies de renderizado separadas (rellenos, contornos, sombras, etc.).
- Estado global mutable mediante el patrón `unsafe { STATE.as_mut() }`.
- Motor de renderizado en Rust de 22.000 líneas.

El sistema de teselas de Penpot (`TileViewbox`, `TileTextureCache`, `TILE_SIZE_MULTIPLIER`) renderiza de antemano las teselas alrededor de la vista y almacena texturas en caché (hasta 1024 entradas).

Pairdraw vuelve a renderizar toda la vista en cada fotograma, porque CanvasKit llamado directamente desde TS es lo bastante rápido como para no necesitar teselas.

### Veredicto: renderizado

| Aspecto                | Pairdraw                        | Penpot                                                                       |
| ---------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| Límite JS→WASM         | Directo (objetos TS)            | Empaquetado en binario (estructura de 104 bytes con las propiedades básicas) |
| Modelo de renderizado  | Inmediato, redibujado completo  | Teselas en caché                                                             |
| Gestión de superficies | 1 superficie                    | 11 superficies                                                               |
| Coste de memoria       | Bajo (sin caché de teselas)     | Alto (caché de 1024 teselas)                                                 |
| Complejidad del código | unas 2.500 líneas (14 archivos) | 22.000 líneas                                                                |
| Código no seguro       | Ninguno                         | Estado global `unsafe`                                                       |

Con el renderizador WASM de Penpot activado, ambos proyectos usan Skia mediante JS→WASM. Pairdraw llama a CanvasKit directamente con objetos TS. Penpot descompone los datos de ClojureScript en estructuras empaquetadas en binario, las escribe en la memoria lineal de WASM y renderiza con un motor Rust de 22.000 líneas. Con WASM desactivado (lo predeterminado), Penpot renderiza las formas como un árbol DOM de SVG. En documentos pequeños y medianos, la ruta directa de CanvasKit es más rápida. El sistema de teselas de Penpot puede ganar en lienzos extremadamente grandes (más de 100.000 formas) en los que solo se ve una zona pequeña, pero su coste es considerable.

## 4. Grafo de escena y modelo de datos

### **Pairdraw**

```typescript
// Flat map, O(1) lookup
nodes: Map<string, SceneNode>
// 64 node types in Figma's Kiwi schema; the engine builds 20
// NodeChange carries about 290 Figma-compatible fields
```

- Interfaces de TypeScript con tipos estrictos.
- Los GUID siguen el formato `sessionID:localID` de Figma.
- Acceso directo a las propiedades, sin capas de indirección.

### Penpot

```clojure
;; 20+ type definition files in common/src/app/common/types/
;; shapes_builder.cljc, shapes_helpers.cljc
;; Separate type systems for: color, component, container, fills,
;; grid, modifiers, objects_map, page, path, etc.
```

- Datos repartidos por `common/` (49.600 líneas de .cljc).
- Módulos de geometría separados para la disposición flex (unos 6 archivos), la disposición en cuadrícula (unos 5 archivos), restricciones, límites, esquinas y efectos.
- Validación de esquemas en tiempo de ejecución (Malli).
- Los datos tienen que cruzar el límite CLJS→Rust para renderizarse.

### Veredicto: modelo de datos

Pairdraw reutiliza directamente en TypeScript el esquema probado de Figma (605 definiciones Kiwi), sin ninguna traducción. Penpot mantiene su propio sistema de tipos en Clojure, ClojureScript y Rust, y tiene que sincronizar a mano los tres.

## 5. Motor de disposición

### Pairdraw: Yoga WASM (314 líneas)

```typescript
import Yoga from 'yoga-layout'
// Direct mapping: Figma stack* fields → Yoga flex properties
const root = Yoga.Node.create()
root.setFlexDirection(FlexDirection.Row)
root.calculateLayout()
applyYogaLayout(graph, frame, yogaRoot)
```

314 líneas en total. Síncrono y dentro del proceso.

### Penpot: doble implementación

1. **ClojureScript** (common): `flex_layout/` (6 archivos), `grid_layout/` (más de 5 archivos), implementaciones propias.
2. **Rust WASM**: `flex_layout.rs` (741 líneas), `grid_layout.rs` (843 líneas), reimplementadas desde cero.

Penpot mantiene **dos motores de disposición independientes** (CLJS y Rust) que deben producir resultados idénticos.

### Veredicto: disposición

Pairdraw delega en una biblioteca muy probada (Yoga, que React Native usa en miles de millones de dispositivos) con 314 líneas. Penpot mantiene más de 3.000 líneas de código de disposición propio duplicado en dos lenguajes.

## 6. Formato de archivo y compatibilidad con Figma

### **Pairdraw**

- **Formato binario Kiwi nativo**: la misma serialización que Figma usa internamente.
- Importación directa de archivos `.fig` mediante el códec Kiwi (el esquema en `packages/kiwi/src/fig/schema/fig.kiwi`, la codificación en `codec.ts`).
- Pegado desde el portapapeles de Figma (lee el binario Kiwi de Figma desde el portapapeles).
- El códec Kiwi cubre el esquema de mensajes multijugador de Figma (Pairdraw no se conecta a los servidores de Figma).

### Penpot

- **Archivo ZIP** (archivos `.penpot`) con manifiestos JSON, datos JSON por archivo, recursos binarios y miniaturas (formato v3).
- SVG para el renderizado y la exportación predeterminados (hay un renderizador WASM opcional).
- Sin importación nativa de `.fig`.
- Tres versiones del formato (v1 Transit heredado, v2 y v3 JSON dentro de ZIP) con un sistema de migración.

### Veredicto: formato de archivo

Pairdraw tiene una ventaja importante: lee archivos de Figma de forma nativa e incluso pega datos del portapapeles de Figma. Penpot requiere exportar e importar a mano y no puede abrir archivos `.fig`.

## 7. Gestión del estado y deshacer

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

Funciones de avance y retroceso que capturan el estado mínimo. Soporte de lotes para operaciones de varios pasos.

### Penpot

La gestión del estado usa Potok (una biblioteca tipo Redux para átomos de ClojureScript). Los eventos implementan `UpdateEvent` (estado→estado puro) o `WatchEvent` (efectos secundarios mediante RxJS). Deshacer almacena vectores de cambios inversos (50 entradas como máximo), con transacciones que agrupan los cambios rápidos y caducan solas a los 20 segundos.

### Veredicto: estado

El enfoque de Pairdraw es más sencillo y cuesta menos. El de Penpot se adapta mejor a la colaboración (los cambios son serializables), pero a costa de más complejidad.

## 8. Experiencia de desarrollo

| Métrica                                 | Pairdraw                                     | Penpot                                             |
| --------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| Entorno de desarrollo                   | `bun install && bun dev`                     | Docker Compose + JVM + Node + herramientas de Rust |
| Recarga en caliente                     | Vite HMR                                     | shadow-cljs                                        |
| Comprobación de tipos                   | TypeScript (estricto)                        | En tiempo de ejecución (esquemas Malli)            |
| Compilación                             | Vite y Cargo                                 | Arranque de la JVM + compilación CLJS + Rust WASM  |
| Barrera para contribuir por primera vez | Baja (TS/Vue)                                | Alta (Clojure + Rust + Docker)                     |
| Escritorio                              | Tauri v2 (instalador de unos 20 MB en macOS) | No disponible (solo navegador)                     |
| Disponibilidad de desarrolladores       | Enorme (desarrolladores TS/Vue)              | Muy reducida (ClojureScript + Rust)                |

## 9. Características de rendimiento

Son diferencias de estructura, no mediciones: ningún editor se ha medido frente al otro.

| Escenario                    | Pairdraw                                         | Penpot                                         |
| ---------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| Arranque en frío             | Cargar los módulos WASM                          | Arrancar el servidor y luego el cliente y WASM |
| Recorrido de una operación   | Dentro del proceso                               | Ida y vuelta por la red hasta el servidor      |
| Fotograma                    | Llamada directa a Skia                           | CLJS→JS→WASM FFI→Skia                          |
| Procesos en marcha           | Una pestaña del navegador o la app de escritorio | JVM + Postgres + Valkey + navegador            |
| Funcionamiento sin conexión  | Completo (local primero)                         | Ninguno (depende del servidor)                 |
| Renderizado de 10.000 formas | Una pasada, sin caché                            | Por teselas con 11 superficies                 |

## 10. Qué hace mejor Penpot

1. **Colaboración en el servidor:** edición multiusuario centralizada con WebSockets, cuentas de usuario y control de acceso, probada a escala (Pairdraw solo permite editar en conjunto mediante un servidor opcional y autoalojado de Pairdraw Cloud, y no tiene salas de igual a igual).
2. **Sistema de plugins:** API de plugins completa con ejecución aislada y un ecosistema de plugins (los complementos de Pairdraw se ejecutan de uno en uno y sin acceso a la red).
3. **Disposición con CSS Grid:** implementación propia (Pairdraw usa una variante de Yoga con soporte de Grid).
4. **Alojamiento propio:** despliegue para equipos basado en Docker (Pairdraw Cloud es un único proceso Node, y más reciente).
5. **Madurez:** años de uso en producción, probado a escala.

## 11. Scripts y extensibilidad

Pairdraw incluye un [comando `eval`](/programmable/cli/scripting) que ofrece una API de plugins compatible con Figma para scripts sin interfaz: operaciones por lotes, pruebas automatizadas y modificaciones guiadas por AI se ejecutan sin la interfaz gráfica. Además, **142 herramientas de AI** están disponibles en el chat integrado, el servidor MCP (stdio + HTTP) y la CLI, y cubren lectura, creación, modificación, estructura, variables, rutas vectoriales, análisis (color, tipografía, espaciado, agrupaciones), comparación, operaciones booleanas y organización. Penpot tiene un sistema de plugins con ejecución aislada, pero no una API de scripts sin interfaz ni integración MCP.

## Resumen

| Dimensión                            | Ganador      | Motivo                                                                                                                                                                        |
| ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Simplicidad de la arquitectura**   | **Pairdraw** | Un solo proceso frente a 5 o más servicios                                                                                                                                    |
| **Rendimiento de renderizado**       | **Pairdraw** | CanvasKit directo frente a DOM de SVG (predeterminado) o WASM empaquetado en binario                                                                                          |
| **Mantenibilidad del código**        | **Pairdraw** | Un solo proceso y una base de código tipada frente a servicios en 4 o más lenguajes                                                                                           |
| **Compatibilidad con Figma**         | **Pairdraw** | Códec Kiwi nativo frente a ningún soporte de `.fig`                                                                                                                           |
| **Incorporación de desarrolladores** | **Pairdraw** | TS/Vue frente a Clojure/Rust/Docker                                                                                                                                           |
| **Experiencia de escritorio**        | **Pairdraw** | Tauri nativo frente a solo navegador                                                                                                                                          |
| **Motor de disposición**             | **Pairdraw** | Yoga (probado) frente a doble implementación propia                                                                                                                           |
| **Colaboración**                     | Penpot       | Ambos basados en servidor con control de acceso; el servidor autoalojado de Cloud de Pairdraw es opcional y más reciente, y los documentos locales no se comparten en directo |
| **Alojamiento propio**               | Penpot       | Listo para Docker frente a un servidor de Cloud de un solo proceso más reciente                                                                                               |
| **Madurez del ecosistema**           | Penpot       | Años de producción frente a una fase temprana                                                                                                                                 |

Pairdraw es más ligero en su arquitectura: un renderizador CanvasKit de un solo proceso en TypeScript, compatible con Figma por diseño. Penpot es una plataforma completa con unas 299.000 líneas en Clojure, ClojureScript, Rust y SCSS, más una flota de servicios Docker. Ambos ofrecen colaboración en tiempo real mediante un servidor, que en Pairdraw es opcional. Penpot tiene un ecosistema de plugins; **Pairdraw** tiene scripts sin interfaz compatibles con Figma, **142 herramientas de AI/MCP**, exportación SVG y PDF, y una aplicación de escritorio nativa.
