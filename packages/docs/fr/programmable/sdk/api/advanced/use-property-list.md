---
title: usePropertyList
description: Accéder au contexte fourni par PropertyListRoot.
---

# usePropertyList

`usePropertyList()` lit le contexte local de la liste de propriétés fourni par `PropertyListRoot`.

Utilisez-le dans les descendants qui ont besoin des éléments contrôlés, des informations d’état mixte ou des gestionnaires par ligne pour les remplissages, contours ou effets. Il n’accède pas à un éditeur.

Les panneaux d’un éditeur Pairdraw peuvent utiliser `useEditorPropertyList(propKey)` dans un composant adaptateur pour relier la primitive contrôlée à la sélection, au regroupement des étapes d’annulation et aux modifications sur plusieurs objets.

## Voir aussi

- [PropertyListRoot](../components/property-list-root)
- [PropertyListItem](../components/property-list-item)
