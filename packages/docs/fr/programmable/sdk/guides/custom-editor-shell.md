---
title: Interface d’édition personnalisée
description: Créer une interface avec provideEditor, CanvasRoot, Menus, Panneaux et Toolbars.
---

# Interface d’édition personnalisée

Une application Pairdraw avec Vue comporte généralement trois couches :

1. `@pairdraw/core` crée l’éditeur ;
2. `@pairdraw/vue` le relie aux composables et composants sans styles de Vue ;
3. l’application définit la disposition, les styles et le comportement propre au produit.

## Pourquoi c’est important

L’application Pairdraw intégrée n’est qu’une interface possible.

Vous pouvez en créer une très différente pour un workflow ciblé : un éditeur intégré à un autre produit, un outil interne pour les ressources, un éditeur de modèles, une interface d’annotation ou une surface d’édition assistée par l’IA avec des contrôles sur mesure.

C’est la principale raison d’être du SDK.

## Structure recommandée

Une interface courante :

- exécute `provideEditor()` haut dans l’arbre des composants ;
- place le canvas au centre ;
- affiche les pages et les calques dans un panneau latéral ;
- affiche les propriétés dans le panneau opposé ;
- pilote Menus et Toolbars avec des composables.

## Exemple

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { createDefaultEditorState, createEditor } from '@pairdraw/core'
import { SceneGraph } from '@pairdraw/scene-graph'
import { provideEditor } from '@pairdraw/vue'
import { CanvasRoot, CanvasSurface } from '@pairdraw/vue/canvas'
import { ToolbarRoot } from '@pairdraw/vue/primitives/Toolbar'
import { PageListRoot } from '@pairdraw/vue/primitives/PageList'

const graph = new SceneGraph()
const page = graph.getPages()[0]
if (!page) throw new Error('Expected an initial page')

const editor = createEditor({
  graph,
  state: reactive(createDefaultEditorState(page.id)),
  getViewportSize: () => ({ width: 1440, height: 900 }),
})
provideEditor(editor)
</script>

<template>
  <div class="grid h-screen grid-cols-[240px_1fr_320px] grid-rows-[48px_1fr]">
    <ToolbarRoot v-slot="{ tools, activeTool, actions }">
      <header class="col-span-3 flex items-center gap-2 border-b px-3">
        <button
          v-for="tool in tools"
          :key="tool.key"
          :data-active="activeTool === tool.key"
          @click="actions.setTool(tool.key)"
        >
          {{ tool.label }}
        </button>
      </header>
    </ToolbarRoot>

    <aside class="border-r">
      <PageListRoot v-slot="{ pages, currentPageId, actions }">
        <nav>
          <button
            v-for="page in pages"
            :key="page.id"
            :data-active="page.id === currentPageId"
            @click="actions.switch(page.id)"
          >
            {{ page.name }}
          </button>
        </nav>
      </PageListRoot>
    </aside>

    <main>
      <CanvasRoot>
        <CanvasSurface class="size-full" />
      </CanvasRoot>
    </main>

    <aside class="border-l">
      Properties panel here
    </aside>
  </div>
</template>
```

Les dimensions fixes de la zone d’affichage ci-dessus gardent l’exemple court. Dans une interface redimensionnable, renvoyez depuis `getViewportSize` la taille réelle du conteneur de la zone de travail, sans les barres latérales ni la barre d’outils qui l’entourent. Consultez [Premiers pas avec le SDK](../getting-started) pour la configuration requise à l’installation et les notes de migration.

## Pourquoi cette répartition fonctionne

- Le SDK gère l’intégration avec l’éditeur et la logique réutilisable sans styles.
- L’application contrôle la disposition, les styles et ses propres actions.
- Les composables fournissent les données des menus et panneaux sans imposer de composants enveloppants supplémentaires.

## Voir aussi

- [provideEditor](../api/composables/provide-editor)
- [useCanvas](../api/composables/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
