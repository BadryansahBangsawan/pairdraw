---
title: Premiers pas avec le SDK
description: Connectez @pairdraw/vue, créez un éditeur et configurez la zone de travail.
---

# Premiers pas avec le SDK

## Installation

```bash
bun add @pairdraw/core @pairdraw/scene-graph @pairdraw/vue canvaskit-wasm
```

Le SDK se trouve dans le monorepo Pairdraw et est publié sous forme de package `@pairdraw/vue`. La version de développement actuelle nécessite Vue `^3.5.41` et, si vous utilisez sa dépendance pair facultative CanvasKit, `canvaskit-wasm >=0.41.1`. Avec une version plus ancienne, vérifiez les dépendances pairs requises par le package installé.

```ts
import { createEditor } from '@pairdraw/core'
import { provideEditor } from '@pairdraw/vue'
import { useCanvas } from '@pairdraw/vue/canvas/surface'
```

## Couches de l'application

Une application basée sur le SDK se compose de trois couches :

1. `@pairdraw/core` — le moteur de l'éditeur, indépendant du framework ;
2. `@pairdraw/vue` — les composables et composants sans styles pour Vue ;
3. l'application — la présentation, le routage, la gestion des fichiers et l'interface propre au produit.

## Configuration minimale

### 1. Créez un éditeur

```ts twoslash
// @module: esnext
// @moduleResolution: bundler
// ---cut---
import { reactive } from 'vue'
import { createDefaultEditorState, createEditor } from '@pairdraw/core'
import { SceneGraph } from '@pairdraw/scene-graph'

const graph = new SceneGraph()
const page = graph.getPages()[0]
if (!page) throw new Error('Expected an initial page')

const editor = createEditor({
  graph,
  state: reactive(createDefaultEditorState(page.id)),
  getViewportSize: () => ({ width: 1200, height: 800 }),
})
```

L'état du noyau est indépendant du framework ; lui passer un état réactif permet aux contrôles Vue d'observer les changements de l'éditeur. Pour un éditeur redimensionnable, faites renvoyer à `getViewportSize` les dimensions actuelles du conteneur de la zone de travail. `width` et `height` ne sont pas des propriétés de `EditorOptions`.

Les icônes viennent d'Iconify par défaut. Pour les servir depuis une autre source, par exemple un jeu d'icônes intégré au bundle ou auto-hébergé, passez un `IconProvider` de `@pairdraw/core/icons` dans l'option `icons` ; les commandes de l'éditeur, son sélecteur d'icônes et ses outils d'IA l'utilisent tous.

### 2. Rendez l'éditeur accessible aux composants descendants

```vue
<script setup lang="ts">
import { provideEditor } from '@pairdraw/vue'

import type { Editor } from '@pairdraw/core'

const props = defineProps<{
  editor: Editor
}>()

provideEditor(props.editor)
</script>

<template>
  <slot />
</template>
```

`provideEditor()` constitue la couche fournisseur de l'arbre de l'éditeur : il rend l'instance accessible à tous les composants situés plus bas dans l'arbre. La documentation appelle directement cette fonction, car elle fait partie de l'API publique actuelle.

### 3. Connectez la zone de travail

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useEditor } from '@pairdraw/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
</script>

<template>
  <canvas ref="canvasRef" class="size-full" />
</template>
```

## Utiliser les composables

Après l'appel à `provideEditor()`, les composants descendants peuvent consulter la sélection et exécuter des commandes de l'éditeur :

```ts
import { useEditorCommands } from '@pairdraw/vue/editor/commands'
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Exemple simple

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useEditor } from '@pairdraw/vue'
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()
const { selectedCount } = useSelectionState()

useCanvas(canvasRef, editor, {
  onReady: () => {
    console.log('Canvas ready')
  },
})
</script>

<template>
  <div class="grid h-full grid-rows-[1fr_auto]">
    <canvas ref="canvasRef" class="size-full" />
    <div class="border-t px-3 py-2 text-xs text-muted">
      Selected: {{ selectedCount }}
    </div>
  </div>
</template>
```

## Migrer depuis la v0.14.0

Ces changements décrivent la version de développement actuelle ; appliquez-les lors d'une mise à niveau au-delà de la v0.14.0.

- **Remplacements du Scene Graph :** remplacez les enregistrements `SceneNode.overrides` par `instanceOverrides`, dont les tables `self` et `descendants` distinguent les remplacements au niveau de l'instance de ceux des descendants. Utilisez les fonctions publiques de remplacement de `@pairdraw/scene-graph` au lieu de traiter ce changement comme un simple renommage de champ.
- **Géométrie dérivée :** renommez `figmaDerivedLayout` en `derivedLayout`, `figmaDerivedTextGlyphs` en `derivedTextGlyphs` et le type exporté `FigmaDerivedTextGlyph` en `DerivedTextGlyph`.
- **Fournisseurs de liaison :** implémentez `getBindingId()` et gérez `unresolved`. Pour `edit-variable`, remplacez `setValue()` par `prepareEdit()`, qui capture la clé de modification, la valeur, la fonction d'écriture et la fonction de restauration. Voir [BindableValue](/programmable/sdk/api/components/bindable-value).
- **Traductions :** remplacez `useDialogMessages()` et `dialogMessages` par les composables et catalogues du domaine produit concerné, comme `useSettingsMessages()` ou `useRenameMessages()`. Les clés des catalogues ont aussi changé de place ; ne vous contentez pas de renommer l'import. Voir [useI18n](./api/composables/use-i18n).
- **CanvasKit :** utilisez `PathBuilder` pour la construction mutable et conservez les tracés renvoyés par les opérations immuables de `Path` au lieu d'attendre une modification sur place.
- **Outils personnalisés :** utilisez des schémas Valibot natifs dans `input` et des métadonnées d'exécution au lieu de `params`, `ParamDef` ou `paramToZod()`. Les intégrations MCP programmatiques utilisent les types serveur et client du MCP SDK v2 ; voir [MCP](/programmable/mcp-server).

## Étapes suivantes

- [Architecture](./architecture)
- [Référence de l'API](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)
