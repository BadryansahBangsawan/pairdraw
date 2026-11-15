---
title: API della lingua
description: Store e metadati di basso livello per la lingua esportati da @pairdraw/vue.
---

# API della lingua

Oltre a `useI18n()`, il Vue SDK esporta primitive di livello più basso per la lingua, pensate per integrazioni avanzate:

- `locale`
- `localeSetting`
- `setLocale()`
- `AVAILABLE_LOCALES`
- `LOCALE_LABELS`

Usale quando vuoi accedere direttamente allo store, devi integrare lo stato della lingua in un contenitore applicativo più ampio o ti servono i metadati delle lingue senza abbonarti all'intero oggetto restituito da `useI18n()`.

## Uso

```ts
import { locale, localeSetting, setLocale, AVAILABLE_LOCALES, LOCALE_LABELS } from '@pairdraw/vue/i18n'
```

## Note

- `locale` è lo store della lingua attiva risolta
- `localeSetting` è lo store della preferenza dell'utente, che viene salvata
- `setLocale()` aggiorna insieme la preferenza e la lingua attiva
- `AVAILABLE_LOCALES` e `LOCALE_LABELS` sono utili per selettori di lingua personalizzati

## Vedi anche

- [useI18n](../composables/use-i18n)
