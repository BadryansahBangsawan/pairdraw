---
title: useI18n
description: Получение переведённых сообщений интерфейса Pairdraw и выбор языка SDK.
---

# useI18n

`useI18n()` — совместимый агрегат, который возвращает реактивные группы переводов и функции выбора языка. Новым компонентам лучше импортировать только нужные composables продуктовых областей, а не подписываться на все каталоги.

```ts twoslash
import { useSettingsMessages, useRenameMessages } from '@pairdraw/vue/i18n'

const settings = useSettingsMessages()
const rename = useRenameMessages()
```

Каждый composable области возвращает реактивный ref. В скрипте читайте `.value`; в шаблонах Vue разворачивает его сам. Выбор языка без агрегата описан в разделе [Locale APIs](../advanced/locale-apis).

## Использование

```ts
import { useI18n } from '@pairdraw/vue/i18n'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Возвращает

Ref-ы переводов: `ai`, `automation`, `code`, `collaboration`, `commands`, `common`, `credentials`, `diagnostics`, `editor`, `files`, `fonts`, `media`, `menu`, `pages`, `panels`, `recovery`, `rendering`, `rename`, `settings`, `storage`, `tools`, `updates`, `variables` и `variableTypes`.

Управление языком: `locale`, `availableLocales`, `localeLabels` и `setLocale`.

Прежняя группа `dialogs`, `useDialogMessages()` и `dialogMessages` удалены в версии для разработки после v0.14.0. Используйте область-владельца, например `settings`, `rename` или `recovery`, и обновите соответствующие ключи сообщений.

## Базовый пример

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

## Примечания

- при смене языка все группы сообщений SDK обновляются автоматически;
- для прямого доступа к хранилищу SDK также экспортирует низкоуровневые примитивы языка.

## Связанные API

- [useMenuModel](./use-menu-model)
- [Locale APIs SDK](../advanced/locale-apis)
