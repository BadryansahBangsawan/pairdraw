---
title: useI18n
description: Lire les messages localisés de l’interface Pairdraw et changer la langue active du SDK.
---

# useI18n

`useI18n()` est un agrégat de compatibilité qui renvoie des groupes de traductions réactifs et les contrôles de langue. Les nouveaux composants doivent importer uniquement les composables des domaines produit dont ils ont besoin, plutôt que de s’abonner à tous les catalogues.

```ts twoslash
import { useSettingsMessages, useRenameMessages } from '@pairdraw/vue/i18n'

const settings = useSettingsMessages()
const rename = useRenameMessages()
```

Chaque composable de domaine renvoie une ref réactive. Lisez `.value` dans le script ; Vue la déballe dans les templates. Consultez les [API de configuration régionale](../advanced/locale-apis) pour changer de langue sans l’agrégat.

## Utilisation

```ts
import { useI18n } from '@pairdraw/vue/i18n'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Valeurs renvoyées

Refs de traduction : `ai`, `automation`, `code`, `collaboration`, `commands`, `common`, `credentials`, `diagnostics`, `editor`, `files`, `fonts`, `media`, `menu`, `pages`, `panels`, `recovery`, `rendering`, `rename`, `settings`, `storage`, `tools`, `updates`, `variables` et `variableTypes`.

Contrôles de langue : `locale`, `availableLocales`, `localeLabels` et `setLocale`.

L’ancien groupe `dialogs`, `useDialogMessages()` et `dialogMessages` sont supprimés dans la version de développement qui suit la v0.14.0. Utilisez le domaine propriétaire, comme `settings`, `rename` ou `recovery`, et mettez à jour les clés de message correspondantes.

## Exemple simple

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

## Remarques

- Les changements de langue sont réactifs dans tous les groupes de messages du SDK.
- Le SDK exporte aussi des primitives de configuration régionale de plus bas niveau lorsque vous avez besoin d’accéder directement au store.

## Voir aussi

- [useMenuModel](./use-menu-model)
- [API de configuration régionale du SDK](../advanced/locale-apis)
