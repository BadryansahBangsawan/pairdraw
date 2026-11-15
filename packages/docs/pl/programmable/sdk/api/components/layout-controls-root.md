---
title: LayoutControlsRoot
description: Komponent bazowy bez narzuconego wyglądu dla automatycznego układu i trybów rozmiaru.
---

<script setup lang="ts">
import { data } from '#docs-api/components/layout-controls-root.data'
</script>

# LayoutControlsRoot

`LayoutControlsRoot` udostępnia kontrakt slotu zwracany przez `useLayout()` jako komponent strukturalny. Użyj go, gdy potrzebujesz powłoki kontrolek układu wielokrotnego użytku z kodem HTML należącym do aplikacji.

Pola szerokości i wysokości mogą pozostać edytowalne, gdy ich oś używa trybu Hug lub Fill. Przy pierwszej faktycznej zmianie liczbowej `updateAxisSize()` zapisuje zmianę trybu rozmiaru i przełącza tę oś na Fixed. Połącz pole z [`BindableValue`](/programmable/sdk/api/components/bindable-value) i dostawcą obsługującym grupy interakcji, gdy tryb rozmiaru, odłączenie zmiennej i wartość liczbowa muszą zapisać się lub wycofać jako jeden krok cofania. Fokus i otwarcie próbnika nie zmieniają trybu rozmiaru.

W menu trybu rozmiaru używaj `setAxisSizing('width', mode)` lub `setAxisSizing('height', mode)`. Starsze funkcje ustawiające osobno każdą oś nie należą do obecnego kontraktu.

## Wygenerowana dokumentacja API

Poniższe tabele są wyodrębniane z kodu źródłowego Vue i komentarzy JSDoc podczas budowania dokumentacji.

<SdkComponentAPI :components="data.components" />

## Zobacz też

- [useLayout](../composables/use-layout)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [Panele właściwości](../../guides/property-panels)
