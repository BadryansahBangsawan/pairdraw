---
title: useCanvasInput
description: Relier pointeur, glissement, sélection, redimensionnement, rotation et outils à la zone de travail.
---

# useCanvasInput

`useCanvasInput()` relie les interactions du pointeur et de la souris à la zone de travail de l’éditeur.

Il prend en charge des interactions comme :

- la sélection ;
- le glissement ;
- le redimensionnement ;
- la rotation ;
- le déplacement de la vue ;
- les flux de la plume et du dessin ;
- l’interaction avec l’édition de texte ;
- la détection des objets touchés selon la portée active.

## Utilisation

Ce composable est généralement associé à `useCanvas()` et aux fonctions de détection du moteur de rendu.

```ts
useCanvasInput(
  canvasRef,
  editor,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
)
```

## Exemple simple

```ts
const canvas = useCanvas(canvasRef, editor)

useCanvasInput(
  canvasRef,
  editor,
  canvas.hitTestSectionTitle,
  canvas.hitTestComponentLabel,
  canvas.hitTestFrameTitle,
)
```

## Exemples pratiques

### Suivre le curseur dans l’espace de la zone de travail

```ts
useCanvasInput(
  canvasRef,
  editor,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
  (cx, cy) => {
    console.log(cx, cy)
  },
)
```

## Remarques

Ce composable est de plus bas niveau que la plupart de la logique des panneaux. Il convient surtout aux interfaces d’éditeur et aux conteneurs de la zone de travail.

## Voir aussi

- [useCanvas](./use-canvas)
- [useEditor](./use-editor)
