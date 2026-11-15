---
title: AppearanceControlsRoot
description: Komponent bazowy bez narzuconego wyglądu dla przezroczystości, widoczności, trybu mieszania, promienia i wygładzania narożników.
---

<script setup lang="ts">
import { data } from '#docs-api/components/appearance-controls-root.data'
</script>

# AppearanceControlsRoot

`AppearanceControlsRoot` udostępnia kontrakt slotu zwracany przez `useAppearance()` jako komponent strukturalny. Użyj go, gdy potrzebujesz kontrolek wyglądu wielokrotnego użytku z własną prezentacją.

Komponent podejmuje decyzje prezentacyjne wynikające z zaznaczenia, w tym `showIndependentCorners`. Ten stan staje się aktywny, gdy zaznaczony obiekt jawnie używa niezależnych narożników albo gdy zaimportowany obiekt ma różne wartości narożników mimo nieaktualnej flagi jednolitego promienia. Interfejs powinien opierać się na tym stanie zamiast utrzymywać równoległy lokalny ref rozwinięcia.

`cornerSmoothingPercent` podaje znormalizowaną wartość ze sceny jako `0…100` albo `MIXED`. Zmieniaj ją przez działania narożników, przekazując znormalizowane wartości `0…1`.

Przełączanie niezależnych narożników, edycja wygładzania i zapis poszczególnych narożników przy wielu obiektach tworzą jeden krok cofania, a każdy obiekt zachowuje swoją pierwotną wartość.

## Wygenerowana dokumentacja API

Poniższe tabele są wyodrębniane z kodu źródłowego Vue i komentarzy JSDoc podczas budowania dokumentacji.

<SdkComponentAPI :components="data.components" />

## Zobacz też

- [useAppearance](../composables/use-appearance)
- [Panele właściwości](../../guides/property-panels)
