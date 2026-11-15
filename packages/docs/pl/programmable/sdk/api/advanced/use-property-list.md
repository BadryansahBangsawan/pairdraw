---
title: usePropertyList
description: Dostęp do kontekstu udostępnionego przez PropertyListRoot.
---

# usePropertyList

`usePropertyList()` zwraca kontekst najbliższego `PropertyListRoot`.

Użyj go w komponentach potomnych, które potrzebują kontrolowanych elementów, informacji o stanie mieszanym lub funkcji obsługi wierszy wypełnień, obwiedni i efektów. Nie korzysta z edytora.

Panele edytora Pairdraw mogą używać `useEditorPropertyList(propKey)` w komponencie adaptera, aby połączyć kontrolowany komponent z zaznaczeniem, grupowaniem kroków cofania i zmianami wielu obiektów.

## Zobacz też

- [PropertyListRoot](../components/property-list-root)
- [PropertyListItem](../components/property-list-item)
