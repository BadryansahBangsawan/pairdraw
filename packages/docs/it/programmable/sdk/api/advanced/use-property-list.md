---
title: usePropertyList
description: Accedere al contesto fornito da PropertyListRoot ai componenti discendenti.
---

# usePropertyList

`usePropertyList()` legge il contesto locale dell'elenco di proprietà fornito da `PropertyListRoot`.

Usalo nei componenti discendenti che hanno bisogno di elementi controllati, informazioni sullo stato misto o gestori a livello di riga per riempimenti, contorni o effetti. Non accede a un editor.

I pannelli dell'editor Pairdraw possono usare `useEditorPropertyList(propKey)` in un componente adattatore per collegare il componente controllato alla selezione, al raggruppamento delle operazioni di annullamento e alle modifiche su più nodi.

## Vedi anche

- [PropertyListRoot](../components/property-list-root)
- [PropertyListItem](../components/property-list-item)
