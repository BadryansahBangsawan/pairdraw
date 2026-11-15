---
title: useI18n
description: Leer los mensajes localizados de la interfaz de Pairdraw y cambiar la configuración regional activa del SDK.
---

# useI18n

`useI18n()` es un agregado de compatibilidad que devuelve grupos de traducciones reactivos y controles de configuración regional. Los componentes nuevos deben importar solo los composables de los dominios de producto que necesiten, en lugar de suscribirse a todos los catálogos.

```ts twoslash
import { useSettingsMessages, useRenameMessages } from '@pairdraw/vue/i18n'

const settings = useSettingsMessages()
const rename = useRenameMessages()
```

Cada composable de dominio devuelve una ref reactiva. Lea `.value` en el script; Vue la desenvuelve en las plantillas. Consulte [API de configuración regional](../advanced/locale-apis) para cambiar de configuración regional sin el agregado.

## Uso

```ts
import { useI18n } from '@pairdraw/vue/i18n'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Valores devueltos

Refs de traducciones: `ai`, `automation`, `code`, `collaboration`, `commands`, `common`, `credentials`, `diagnostics`, `editor`, `files`, `fonts`, `media`, `menu`, `pages`, `panels`, `recovery`, `rendering`, `rename`, `settings`, `storage`, `tools`, `updates`, `variables` y `variableTypes`.

Controles de configuración regional: `locale`, `availableLocales`, `localeLabels` y `setLocale`.

El antiguo grupo `dialogs`, `useDialogMessages()` y `dialogMessages` se eliminaron en la versión de desarrollo posterior a v0.14.0. Use el dominio propietario, como `settings`, `rename` o `recovery`, y actualice las claves de mensaje correspondientes.

## Ejemplo básico

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

## Notas

- los cambios de configuración regional son reactivos en todos los grupos de mensajes del SDK
- el SDK también exporta primitivas de configuración regional de más bajo nivel para cuando necesite acceder directamente al almacén

Puede usarse para crear un selector de idioma propio sin duplicar los catálogos del SDK.

## Véase también

- [useMenuModel](./use-menu-model)
- [API de configuración regional del SDK](../advanced/locale-apis)
