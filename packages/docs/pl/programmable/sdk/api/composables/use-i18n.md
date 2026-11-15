---
title: useI18n
description: Odczyt zlokalizowanych komunikatów interfejsu Pairdraw i zmiana aktywnego języka SDK.
---

# useI18n

`useI18n()` to zbiorczy composable zachowany dla zgodności, który zwraca reaktywne grupy tłumaczeń i funkcje sterowania językiem. Nowe komponenty powinny importować tylko te composables dziedzinowe, których potrzebują, zamiast subskrybować wszystkie katalogi.

```ts twoslash
import { useSettingsMessages, useRenameMessages } from '@pairdraw/vue/i18n'

const settings = useSettingsMessages()
const rename = useRenameMessages()
```

Każdy composable dziedzinowy zwraca reaktywny ref. W skrypcie odczytuj `.value`; w szablonach Vue rozpakowuje go sam. Zmianę języka bez zbiorczego composable opisuje strona [Locale API](../advanced/locale-apis).

## Użycie

```ts
import { useI18n } from '@pairdraw/vue/i18n'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Zwracane wartości

Refy tłumaczeń: `ai`, `automation`, `code`, `collaboration`, `commands`, `common`, `credentials`, `diagnostics`, `editor`, `files`, `fonts`, `media`, `menu`, `pages`, `panels`, `recovery`, `rendering`, `rename`, `settings`, `storage`, `tools`, `updates`, `variables` i `variableTypes`.

Sterowanie językiem: `locale`, `availableLocales`, `localeLabels` i `setLocale`.

Dawna grupa `dialogs`, `useDialogMessages()` i `dialogMessages` zostały usunięte w wersji rozwojowej po v0.14.0. Korzystaj z grupy właściwej dziedziny, na przykład `settings`, `rename` lub `recovery`, i zaktualizuj odpowiednie klucze komunikatów.

## Podstawowy przykład

```vue
<script setup lang="ts">
import { useI18n } from '@pairdraw/vue/i18n'

const { menu, locale, availableLocales, localeLabels, setLocale } = useI18n()
</script>

<template>
  <label class="flex items-center gap-2">
    <span>{{ menu.view }}</span>
    <select :value="locale" @change="setLocale(($event.target as HTMLSelectElement).value as typeof locale)">
      <option v-for="code in availableLocales" :key="code" :value="code">
        {{ localeLabels[code] }}
      </option>
    </select>
  </label>
</template>
```

## Uwagi

- Zmiana języka reaktywnie aktualizuje wszystkie grupy komunikatów SDK.
- SDK eksportuje też niskopoziomowe funkcje języka, gdy potrzebny jest bezpośredni dostęp do magazynu stanu.

## Zobacz też

- [useMenuModel](./use-menu-model)
- [Locale API SDK](../advanced/locale-apis)
