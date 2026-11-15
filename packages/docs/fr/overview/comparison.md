# Pairdraw et Penpot : architecture et performances

Pourquoi comparer ? Pairdraw existe parce que les plateformes de design fermées décident de ce qui est possible. Comprendre les différences d’architecture montre ce qu’une alternative ouverte et locale peut faire autrement.

::: info Moteur WASM de Penpot
Penpot 2.x inclut un moteur de rendu Rust/Skia WASM (`render-wasm/v1`) qui s’active par des options serveur ou le paramètre d’URL `?wasm=true`. L’ancien moteur SVG reste celui par défaut. Cette page couvre les deux.
:::

## 1. Taille du code source

| Mesure | Pairdraw | Penpot |
|--------|------------|--------|
| Lignes de code au total | **environ 26 000** | **environ 299 000** |
| Fichiers source | environ 143 | environ 2 900 |
| Langages | TypeScript, Vue | Clojure, ClojureScript, Rust, JS, SQL, SCSS |
| Moteur de rendu | environ 3 200 lignes (TS, 10 fichiers) | 22 000 lignes (Rust/Skia WASM) |
| Interface | environ 4 500 lignes | environ 175 000 lignes (CLJS et SCSS) |
| Serveur | Aucun (architecture locale) | 32 600 lignes et 151 fichiers SQL |
| Rapport | **1×** | **environ 11×** |

Pairdraw est **environ onze fois plus petit**, et c’est tout l’intérêt. Il ne s’agit pas d’une simplification, mais d’une architecture fondamentalement différente.

## 2. Architecture

### Pairdraw : un client monolithique

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

**Tout tient dans un seul processus.** Pas de serveur, pas de base de données, pas de Docker. Le graphe de scène est une `Map<string, SceneNode>` plate en TypeScript. Le rendu appelle Skia CanvasKit directement depuis TypeScript. La disposition passe par Yoga WASM, appelé de manière synchrone.

### Penpot : client-serveur distribué

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

**Au moins cinq services.** PostgreSQL pour la persistance, Redis (Valkey) pour la diffusion de messages et le cache, MinIO pour le stockage des ressources, un serveur JVM, un exportateur Node.js (Chromium sans interface pour le rendu côté serveur) et l’interface ClojureScript. L’environnement de développement exige Docker Compose avec un réseau personnalisé.

### Verdict : architecture

L’architecture à processus unique de Pairdraw supprime :
- la latence réseau entre l’interface et le serveur ;
- le coût de sérialisation et de désérialisation aux frontières entre services ;
- la complexité de l’orchestration de conteneurs ;
- le coût des requêtes en base de données à chaque opération.

L’architecture de Penpot est optimisée pour les **déploiements multiutilisateurs hébergés sur un serveur**. Pairdraw est optimisé pour des **performances locales instantanées**.

## 3. Chaîne de rendu

### Pairdraw : TS → CanvasKit WASM (direct)

```typescript
// renderer.ts — direct CanvasKit calls from TypeScript
renderSceneToCanvas(canvas, graph, pageId) {
  // Iterate nodes, build Skia paths/paints, draw
  this.fillPaint.setColor(...)
  canvas.drawRRect(rrect, this.fillPaint)
}
```

- **Une seule frontière franchie :** TS → WASM (CanvasKit).
- Le graphe de scène vit dans le tas JavaScript : aucune sérialisation n’est nécessaire pour le rendu.
- Un moteur d’environ 3 200 lignes, réparti en 10 fichiers spécialisés : scène, superpositions, remplissages, contours, formes, effets, règles, étiquettes.

### Penpot : JS (compilé depuis CLJS) → Rust WASM → Skia

Penpot 2.x inclut un moteur de rendu Rust/Skia WASM (`render-wasm/v1`), à activer par des options serveur ou `?wasm=true`. Lorsqu’il est activé, les formes sont rendues par cette chaîne :

```
ClojureScript (compiled to JS)
  → decompose to primitives + binary-pack into WASM linear memory
  → Rust WASM (via Emscripten C FFI)
  → skia-safe (Rust Skia bindings)
  → Skia (WebGL)
```

Lorsqu’il est désactivé (par défaut), les formes sont rendues sous forme d’arbre DOM SVG via React/Reagent : chaque forme est un élément DOM.

- **Une seule frontière franchie** (JS → WASM), comme Pairdraw, mais avec un coût de sérialisation explicite : les UUID sont découpés en 4×u32, les transformations en 6×f32, les remplissages et contours sont encodés en binaire, et les propriétés de base sont regroupées dans une structure de 104 octets par forme.
- Un système de rendu par tuiles avec des zones d’intérêt.
- Onze surfaces de rendu distinctes (remplissages, contours, ombres, etc.).
- Un état global mutable via le motif `unsafe { STATE.as_mut() }`.
- Un moteur de rendu Rust de 22 000 lignes.

Le système de tuiles de Penpot (`TileViewbox`, `TileTextureCache`, `TILE_SIZE_MULTIPLIER`) prérend les tuiles autour de la zone visible et met les textures en cache (jusqu’à 1 024 entrées).

Pairdraw rend de nouveau toute la zone visible à chaque image, car CanvasKit appelé directement depuis TypeScript est assez rapide pour se passer de tuiles.

### Verdict : rendu

| Aspect | Pairdraw | Penpot |
|--------|------------|--------|
| Frontière JS → WASM | Directe (objets TS) | Encodage binaire (structure de 104 octets pour les propriétés de base) |
| Modèle de rendu | Immédiat, rendu complet | Cache de tuiles |
| Gestion des surfaces | 1 surface | 11 surfaces |
| Surcoût mémoire | Faible (pas de cache de tuiles) | Élevé (cache de 1 024 tuiles) |
| Complexité du code | environ 3 200 lignes (10 fichiers) | 22 000 lignes |
| Code non sûr | Aucun | État global `unsafe` |

Lorsque le moteur WASM de Penpot est activé, les deux projets utilisent Skia via JS → WASM. Pairdraw appelle CanvasKit directement avec des objets TypeScript. Penpot décompose les données ClojureScript en structures encodées en binaire, les écrit dans la mémoire linéaire WASM et effectue le rendu avec un moteur Rust de 22 000 lignes. Lorsque WASM est désactivé (par défaut), Penpot rend les formes sous forme d’arbre DOM SVG. Pour les documents petits et moyens, la voie CanvasKit directe est plus rapide. Le système de tuiles de Penpot peut l’emporter sur des zones de travail extrêmement grandes (plus de 100 000 formes) dont seule une petite partie est visible, mais son surcoût est important.

## 4. Graphe de scène et modèle de données

### **Pairdraw**

```typescript
// Flat map, O(1) lookup
nodes: Map<string, SceneNode>
// 29 node types from Figma's Kiwi schema
// ~390 fields per NodeChange (Figma-compatible)
```

- Interfaces TypeScript aux types stricts.
- Des GUID au format Figma `sessionID:localID`.
- Accès direct aux propriétés, sans couche d’indirection.

### Penpot

```clojure
;; 20+ type definition files in common/src/app/common/types/
;; shapes_builder.cljc, shapes_helpers.cljc
;; Separate type systems for: color, component, container, fills,
;; grid, modifiers, objects_map, page, path, etc.
```

- Données réparties dans `common/` (49 600 lignes de `.cljc`).
- Modules de géométrie distincts pour la disposition flex (environ 6 fichiers), la disposition en grille (environ 5 fichiers), les contraintes, les limites, les coins et les effets.
- Validation des schémas à l’exécution (Malli).
- Les données doivent franchir la frontière CLJS → Rust pour le rendu.

### Verdict : modèle de données

Pairdraw réutilise directement en TypeScript le schéma éprouvé de Figma (194 définitions Kiwi), sans aucune traduction. Penpot maintient son propre système de types en Clojure, ClojureScript et Rust, ce qui impose de synchroniser les trois à la main.

## 5. Moteur de disposition

### Pairdraw : Yoga WASM (314 lignes)

```typescript
import Yoga from 'yoga-layout'
// Direct mapping: Figma stack* fields → Yoga flex properties
const root = Yoga.Node.create()
root.setFlexDirection(FlexDirection.Row)
root.calculateLayout()
applyYogaLayout(graph, frame, yogaRoot)
```

314 lignes au total. Synchrone, dans le même processus.

### Penpot : double implémentation

1. **ClojureScript** (common) : `flex_layout/` (6 fichiers), `grid_layout/` (5 fichiers ou plus), des implémentations maison.
2. **Rust WASM** : `flex_layout.rs` (741 lignes), `grid_layout.rs` (843 lignes), réécrits de zéro.

Penpot maintient **deux moteurs de disposition indépendants** (CLJS et Rust) qui doivent produire des résultats identiques.

### Verdict : disposition

Pairdraw délègue en 314 lignes à une bibliothèque éprouvée (Yoga, utilisée par React Native sur des milliards d’appareils). Penpot maintient plus de 3 000 lignes de code de disposition maison, dupliquées dans deux langages.

## 6. Format de fichier et compatibilité Figma

### **Pairdraw**

- **Format binaire Kiwi natif** : la même sérialisation que celle utilisée en interne par Figma.
- Import direct des fichiers `.fig` grâce au codec Kiwi extrait (2 178 lignes de schéma et 551 lignes de codec).
- Collage depuis le presse-papiers de Figma (lecture du binaire Kiwi que Figma y place).
- Le codec Kiwi couvre le schéma des messages multijoueurs de Figma (Pairdraw ne se connecte pas aux serveurs de Figma).

### Penpot

- **Archive ZIP** (fichiers `.penpot`) contenant des manifestes JSON, des données JSON par fichier, des ressources binaires et des miniatures (format v3).
- SVG pour le rendu et l’export par défaut (moteur WASM disponible en option).
- Pas d’import `.fig` natif.
- Trois versions de format (v1 Transit historique, v2, v3 JSON dans un ZIP) avec un système de migration.

### Verdict : format de fichier

Pairdraw a un avantage net : il lit nativement les fichiers Figma et peut même coller les données du presse-papiers de Figma. Penpot exige un export et un import manuels et ne peut pas ouvrir les fichiers `.fig`.

## 7. Gestion de l’état et annulation

### **Pairdraw**

```typescript
// 110 LOC — inverse command pattern
class UndoManager {
  apply(entry: UndoEntry) { entry.forward(); this.undoStack.push(entry) }
  undo() { entry.inverse(); this.redoStack.push(entry) }
}
```

110 lignes. Des fermetures d’avancement et d’inversion qui capturent un état minimal. Les lots regroupent les opérations en plusieurs étapes.

### Penpot

La gestion de l’état utilise Potok (une bibliothèque à la Redux pour les atomes ClojureScript). Les événements implémentent `UpdateEvent` (état → état, sans effet de bord) ou `WatchEvent` (effets de bord via RxJS). L’annulation stocke des vecteurs de changements inverses (50 entrées au maximum), avec des transactions qui regroupent les changements rapides et expirent automatiquement après 20 secondes.

### Verdict : état

L’approche de Pairdraw est plus simple et moins coûteuse. Celle de Penpot convient mieux à la collaboration (les changements sont sérialisables), au prix d’une plus grande complexité.

## 8. Expérience de développement

| Mesure | Pairdraw | Penpot |
|--------|------------|--------|
| Mise en place | `bun install && bun dev` | Docker Compose, JVM, Node et outils Rust |
| Rechargement à chaud | Vite HMR (environ 50 ms) | shadow-cljs (plusieurs secondes) |
| Vérification des types | TypeScript (strict) | À l’exécution (schémas Malli) |
| Temps de build | moins de 5 s (Vite) | Plusieurs minutes (démarrage JVM, compilation CLJS et Rust WASM) |
| Barrière à la première contribution | Faible (TS/Vue) | Élevée (Clojure, Rust et Docker) |
| Bureau | Tauri v2 (programme d’installation macOS d’environ 20 Mo) | Aucun (navigateur uniquement) |
| Vivier de recrutement | Immense (développeurs TS/Vue) | Minuscule (ClojureScript et Rust) |

## 9. Performances

| Scénario | Pairdraw | Penpot |
|----------|------------|--------|
| Démarrage à froid | moins de 2 s (chargement WASM) | plus de 10 s (serveur, client et WASM) |
| Latence d’une opération | moins de 1 ms (dans le processus) | 10 à 50 ms (aller-retour réseau) |
| Rendu d’une image | Appel direct à Skia | CLJS → JS → WASM FFI → Skia |
| Mémoire de base | environ 50 Mo (onglet du navigateur) | plus de 300 Mo environ (JVM, Postgres, Valkey et navigateur) |
| Hors ligne | Complet (architecture locale) | Aucun (dépend du serveur) |
| Rendu de 10 000 formes | Une passe, sans cache | Par tuiles, avec 11 surfaces |

## 10. Ce que Penpot fait mieux

1. **Collaboration côté serveur :** édition multiutilisateur centralisée avec WebSockets, comptes utilisateurs et contrôle d’accès, éprouvée à grande échelle (Pairdraw ne permet de modifier ensemble que via un serveur Pairdraw Cloud facultatif et auto-hébergé, et n’a pas de salles pair à pair).
2. **Système de plugins :** API de plugins complète avec exécution isolée et écosystème de plugins (les extensions de Pairdraw s’exécutent une à la fois, sans accès réseau).
3. **Disposition CSS Grid :** implémentation maison (Pairdraw utilise une variante de Yoga qui prend en charge la grille).
4. **Auto-hébergement :** déploiement d’équipe basé sur Docker (Pairdraw Cloud est un seul processus Node, et plus récent).
5. **Maturité :** des années d’utilisation en production, éprouvé à grande échelle.

## 11. Scripts et extensibilité

Pairdraw fournit une [commande `eval`](/fr/programmable/cli/scripting) qui offre une API compatible avec les plugins Figma pour les scripts sans interface : opérations par lots, tests automatisés et modifications pilotées par l’IA s’exécutent tous sans l’interface graphique. En plus, **plus de 130 outils IA** sont disponibles dans le chat intégré, le serveur MCP (stdio et HTTP) et la CLI : lecture, création, modification, structure, variables, tracés vectoriels, analyse (couleurs, typographie, espacements, structures répétées), comparaison, opérations booléennes et organisation. Penpot a un système de plugins avec exécution isolée, mais pas d’API de scripts sans interface ni d’intégration MCP.

## Résumé

| Domaine | Gagnant | Pourquoi |
|---------|---------|----------|
| **Simplicité de l’architecture** | **Pairdraw** | Un seul processus contre au moins cinq services |
| **Performances de rendu** | **Pairdraw** | CanvasKit direct contre DOM SVG (par défaut) ou WASM encodé en binaire |
| **Maintenabilité du code** | **Pairdraw** | Environ 26 000 lignes dans un langage contre 299 000 dans au moins quatre |
| **Compatibilité Figma** | **Pairdraw** | Codec Kiwi natif contre aucune prise en charge de `.fig` |
| **Prise en main pour les développeurs** | **Pairdraw** | TS/Vue contre Clojure/Rust/Docker |
| **Expérience bureau** | **Pairdraw** | Tauri natif contre navigateur uniquement |
| **Moteur de disposition** | **Pairdraw** | Yoga (éprouvé) contre double implémentation maison |
| **Collaboration** | Penpot | Les deux passent par un serveur avec contrôle d’accès ; le serveur Cloud auto-hébergé de Pairdraw est facultatif et plus récent, et les documents locaux n’ont pas de partage en direct |
| **Auto-hébergement** | Penpot | Prêt pour Docker contre un serveur Cloud à processus unique plus récent |
| **Maturité de l’écosystème** | Penpot | Des années de production contre un stade précoce |

Pairdraw est plus léger sur le plan de l’architecture : un moteur de rendu CanvasKit à processus unique, environ 26 000 lignes de TypeScript, compatible avec Figma par conception. Penpot est une plateforme complète d’environ 299 000 lignes en Clojure, ClojureScript, Rust et SCSS, avec une flotte de services Docker. Les deux offrent la collaboration en temps réel via un serveur, que Pairdraw garde facultatif. Penpot a un écosystème de plugins ; **Pairdraw** a des scripts sans interface compatibles Figma, **plus de 130 outils IA/MCP**, l’export SVG et PDF, et une application de bureau native.
