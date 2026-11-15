---
title: usePropertyList
description: Kontext-Hilfsmittel für Komponenten innerhalb von PropertyListRoot.
---

# usePropertyList

`usePropertyList()` liest den lokalen Eigenschaftslisten-Kontext, den `PropertyListRoot` bereitstellt.

Verwenden Sie das Composable in untergeordneten Komponenten, die kontrollierte Einträge, Informationen zum gemischten Zustand oder zeilenbezogene Handler für Füllungen, Konturen oder Effekte benötigen. Es greift nicht auf einen Editor zu.

Editorpanels von Pairdraw können in einer Adapterkomponente `useEditorPropertyList(propKey)` verwenden, um die kontrollierte Basiskomponente mit Auswahl, gebündeltem Rückgängigmachen und Änderungen an mehreren Objekten zu verbinden.

## Siehe auch

- [PropertyListRoot](../components/property-list-root)
- [PropertyListItem](../components/property-list-item)
