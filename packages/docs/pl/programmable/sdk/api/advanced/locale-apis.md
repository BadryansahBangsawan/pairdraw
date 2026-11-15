---
title: Locale API
description: Niskopoziomowe magazyny języka i metadane eksportowane przez @pairdraw/vue.
---

# Locale API

Oprócz `useI18n()` Vue SDK eksportuje niskopoziomowe funkcje języka do zaawansowanych integracji:

- `locale`
- `localeSetting`
- `setLocale()`
- `AVAILABLE_LOCALES`
- `LOCALE_LABELS`

Użyj ich, gdy potrzebujesz bezpośredniego dostępu do magazynu, chcesz zintegrować stan języka z większą powłoką aplikacji albo potrzebujesz metadanych języków bez subskrybowania całego obiektu zwracanego przez `useI18n()`.

## Użycie

```ts
import { locale, localeSetting, setLocale, AVAILABLE_LOCALES, LOCALE_LABELS } from '@pairdraw/vue/i18n'
```

## Uwagi

- `locale` to magazyn rozstrzygniętego, aktywnego języka.
- `localeSetting` to magazyn trwale zapisanej preferencji użytkownika.
- `setLocale()` aktualizuje jednocześnie preferencję i aktywny język.
- `AVAILABLE_LOCALES` i `LOCALE_LABELS` przydają się przy budowie własnego wyboru języka.

## Zobacz też

- [useI18n](../composables/use-i18n)
