---
title: useMenuModel
description: Budowa modeli menu aplikacji i obszaru roboczego na podstawie bieżącego stanu edytora.
---

# useMenuModel

`useMenuModel()` buduje struktury menu wyższego poziomu na podstawie poleceń edytora i stanu zaznaczenia.

Przydaje się, gdy potrzebujesz gotowych do wyświetlenia grup menu zamiast ręcznego składania poleceń.

## Użycie

```ts
import { useMenuModel } from '@pairdraw/vue/editor/menu-model'

const { appMenu, canvasMenu, selectionLabelMenu } = useMenuModel()
```

## Podstawowy przykład

```ts
const { canvasMenu } = useMenuModel()
```

Przekaż `canvasMenu.value` do własnego komponentu menu kontekstowego.

## Praktyczne przykłady

### Górne menu w stylu aplikacji

`appMenu` grupuje pozycje w menu:

- Edycja;
- Widok;
- Obiekt;
- Rozmieszczenie.

### Menu kontekstowe z przenoszeniem na strony

`canvasMenu` zawiera pozycje dynamiczne, takie jak „Przenieś na stronę”, zależne od bieżącego zaznaczenia i dostępnych stron.

### Etykiety zależne od zaznaczenia

`selectionLabelMenu` udostępnia etykiety zależne od kontekstu, takie jak:

- „Ukryj” / „Pokaż”;
- „Zablokuj” / „Odblokuj”.

## Zobacz też

- [useEditorCommands](./use-editor-commands)
- [useSelectionState](./use-selection-state)
- [useSelectionCapabilities](./use-selection-capabilities)
