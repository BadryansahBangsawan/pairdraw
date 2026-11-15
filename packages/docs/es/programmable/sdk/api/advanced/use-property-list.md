---
title: usePropertyList
description: Función de contexto de primitivas para los descendientes de PropertyListRoot.
---

# usePropertyList

`usePropertyList()` lee el contexto local de la lista de propiedades que proporciona `PropertyListRoot`.

Úselo dentro de descendientes que necesiten los elementos controlados, la información del estado mixto o los controladores de cada fila de rellenos, contornos o efectos. No accede a ningún editor.

Los paneles del editor de Pairdraw pueden usar `useEditorPropertyList(propKey)` en un componente adaptador para conectar la primitiva controlada con la selección, la agrupación para deshacer y las modificaciones de varios objetos.

## Véase también

- [PropertyListRoot](../components/property-list-root)
- [PropertyListItem](../components/property-list-item)
