---
title: useI18n
description: Leggere i messaggi localizzati dell'interfaccia Pairdraw e cambiare la lingua attiva dell'SDK.
---

# useI18n

`useI18n()` è un aggregato di compatibilità che restituisce gruppi di traduzioni reattivi e i controlli della lingua. I nuovi componenti dovrebbero importare solo i composable dei domini di prodotto di cui hanno bisogno, invece di abbonarsi a tutti i cataloghi.

```ts twoslash
import { useSettingsMessages, useRenameMessages } from '@pairdraw/vue/i18n'

const settings = useSettingsMessages()
const rename = useRenameMessages()
```

Ogni composable di dominio restituisce un ref reattivo. Nello script leggi `.value`; nei template Vue lo scompatta da solo. Per cambiare lingua senza l'aggregato vedi le [API della lingua](../advanced/locale-apis).

## Uso

```ts
import { useI18n } from '@pairdraw/vue/i18n'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Valori restituiti

Ref di traduzione: `ai`, `automation`, `code`, `collaboration`, `commands`, `common`, `credentials`, `diagnostics`, `editor`, `files`, `fonts`, `media`, `menu`, `pages`, `panels`, `recovery`, `rendering`, `rename`, `settings`, `storage`, `tools`, `updates`, `variables` e `variableTypes`.

Controlli della lingua: `locale`, `availableLocales`, `localeLabels` e `setLocale`.

Il vecchio gruppo `dialogs`, `useDialogMessages()` e `dialogMessages` sono stati rimossi nella versione di sviluppo successiva alla v0.14.0. Usa il dominio a cui appartiene il messaggio, come `settings`, `rename` o `recovery`, e aggiorna le chiavi dei messaggi corrispondenti.

## Esempio di base

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

## Note

- i cambi di lingua sono reattivi in tutti i gruppi di messaggi dell'SDK
- l'SDK esporta anche primitive della lingua di livello più basso quando ti serve accedere direttamente allo store

## Vedi anche

- [useMenuModel](./use-menu-model)
- [API della lingua dell'SDK](../advanced/locale-apis)
