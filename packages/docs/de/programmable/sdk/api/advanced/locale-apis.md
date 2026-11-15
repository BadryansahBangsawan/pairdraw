---
title: Locale API
description: Low-level Locale stores und Metadata aus @pairdraw/vue.
---

# Locale API

Zusätzlich zu `useI18n()` exportiert das Vue SDK Sprach-Grundbausteine auf niedriger Ebene für erweiterte Integrationen:

- `locale`
- `localeSetting`
- `setLocale()`
- `AVAILABLE_LOCALES`
- `LOCALE_LABELS`

Verwenden Sie diese Exporte für direkten Zugriff auf die Stores, um den Sprachzustand in eine größere Anwendungsoberfläche einzubinden oder um Sprachmetadaten zu lesen, ohne das vollständige Rückgabeobjekt von `useI18n()` zu abonnieren.

## Verwendung

```ts
import { locale, localeSetting, setLocale, AVAILABLE_LOCALES, LOCALE_LABELS } from '@pairdraw/vue/i18n'
```

## Verhalten

- `locale` ist der Store mit der tatsächlich aktiven Sprache.
- `localeSetting` ist der Store mit der gespeicherten Einstellung des Benutzers.
- `setLocale()` aktualisiert Einstellung und aktive Sprache gemeinsam.
- `AVAILABLE_LOCALES` und `LOCALE_LABELS` helfen beim Aufbau einer eigenen Sprachauswahl.

## Siehe auch

- [useI18n](../composables/use-i18n)
