---
title: usePropertyList
description: Доступ к контексту PropertyListRoot из дочернего компонента.
---

# usePropertyList

`usePropertyList()` возвращает контекст ближайшего `PropertyListRoot`.

Используйте composable в дочерних компонентах, которым нужны управляемые элементы, смешанное состояние или действия строк для заливок, обводок и эффектов. Сам composable не обращается к редактору.

Панели редактора Pairdraw могут использовать `useEditorPropertyList(propKey)` в компоненте-адаптере, чтобы связать управляемый компонент с выделением, пакетной отменой и изменением нескольких объектов.

## См. также

- [PropertyListRoot](../components/property-list-root)
- [PropertyListItem](../components/property-list-item)
