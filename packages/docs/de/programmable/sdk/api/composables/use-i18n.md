---
title: useI18n
description: Lokalisierte Meldungen der Pairdraw-Oberfläche lesen und die aktive Sprache des SDK wechseln.
---

# useI18n

`useI18n()` ist ein Sammel-Composable aus Kompatibilitätsgründen, das reaktive Übersetzungsgruppen und Funktionen zum Sprachwechsel zurückgibt. Neue Komponenten sollten nur die Composables der Produktbereiche importieren, die sie tatsächlich brauchen, statt alle Kataloge zu abonnieren.

```ts twoslash
import { useSettingsMessages, useRenameMessages } from '@pairdraw/vue/i18n'

const settings = useSettingsMessages()
const rename = useRenameMessages()
```

Jedes dieser Composables gibt eine reaktive Ref zurück. Im Skript lesen Sie `.value`; in Templates entpackt Vue den Wert automatisch. Wie sich die Sprache ohne das Sammel-Composable wechseln lässt, beschreibt die [Locale API](../advanced/locale-apis).

## Verwendung

```ts
import { useI18n } from '@pairdraw/vue/i18n'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Rückgabewert

Übersetzungs-Refs: `ai`, `automation`, `code`, `collaboration`, `commands`, `common`, `credentials`, `diagnostics`, `editor`, `files`, `fonts`, `media`, `menu`, `pages`, `panels`, `recovery`, `rendering`, `rename`, `settings`, `storage`, `tools`, `updates`, `variables` und `variableTypes`.

Sprachsteuerung: `locale`, `availableLocales`, `localeLabels` und `setLocale`.

Die frühere Gruppe `dialogs`, `useDialogMessages()` und `dialogMessages` sind in der Entwicklungsversion nach v0.14.0 entfernt. Verwenden Sie den zuständigen Bereich, etwa `settings`, `rename` oder `recovery`, und passen Sie die entsprechenden Meldungsschlüssel an.

## Einfaches Beispiel

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

## Hinweise

- Ein Sprachwechsel aktualisiert alle Meldungsgruppen des SDK reaktiv.
- Für direkten Zugriff auf den Store exportiert das SDK außerdem einfachere Sprach-Primitive.

## Siehe auch

- [useMenuModel](./use-menu-model)
- [Locale API](../advanced/locale-apis)
