---
title: API de configuración regional
description: Almacenes y metadatos de configuración regional de más bajo nivel que exporta @pairdraw/vue.
---

# API de configuración regional

Además de `useI18n()`, el SDK de Vue exporta primitivas de configuración regional de más bajo nivel para integraciones avanzadas:

- `locale`
- `localeSetting`
- `setLocale()`
- `AVAILABLE_LOCALES`
- `LOCALE_LABELS`

Úselas cuando quiera acceder directamente al almacén, necesite integrar el estado de la configuración regional en una carcasa de aplicación más amplia o quiera los metadatos de configuración regional sin suscribirse a todo el objeto que devuelve `useI18n()`.

## Uso

```ts
import { locale, localeSetting, setLocale, AVAILABLE_LOCALES, LOCALE_LABELS } from '@pairdraw/vue/i18n'
```

## Notas

- `locale` es el almacén de la configuración regional activa ya resuelta
- `localeSetting` es el almacén de la preferencia del usuario que se guarda
- `setLocale()` actualiza a la vez la preferencia y la configuración regional activa
- `AVAILABLE_LOCALES` y `LOCALE_LABELS` resultan útiles para selectores propios

Los identificadores de claves y los nombres de configuración se mantienen en inglés porque forman parte de la API.

## Véase también

- [useI18n](../composables/use-i18n)
