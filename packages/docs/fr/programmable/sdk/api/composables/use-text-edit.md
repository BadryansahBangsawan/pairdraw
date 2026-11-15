---
title: useTextEdit
description: Gérer la saisie DOM, la composition, la mise en forme et la synchronisation des objets texte de la zone de travail.
---

# useTextEdit

`useTextEdit()` relie la saisie de texte du DOM au modèle d’édition de texte de la zone de travail de l’éditeur.

Il coordonne :

- la saisie via un textarea ;
- la composition IME ;
- le clignotement du curseur ;
- le comportement de Suppr et de Retour arrière ;
- les commandes de mise en forme comme gras, italique et souligné ;
- la synchronisation des modifications de texte dans le graphe.

## Utilisation

```ts
useTextEdit(canvasRef, editor)
```

## Exemple simple

Utilisez-le dans le composant qui possède la zone de travail, avec `useCanvas()` et `useCanvasInput()`.

## Exemples pratiques

### Prendre en charge les raccourcis de mise en forme

`useTextEdit()` gère déjà les actions de mise en forme au clavier, comme gras, italique et souligné, pendant l’édition de texte.

### Garder la zone de travail et l’éditeur de texte synchronisés

Il met à jour le texte du graphe et ses plages de style à mesure que l’utilisateur saisit du texte ou modifie des plages mises en forme.

## Remarques

C’est un composable d’intégration entre la zone de travail et l’éditeur, pas un composable générique de champ de texte.

## Voir aussi

- [useCanvas](./use-canvas)
- [useCanvasInput](./use-canvas-input)
