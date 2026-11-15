---
title: API de configuration régionale
description: Stores de langue et métadonnées de bas niveau exportés par @pairdraw/vue.
---

# API de configuration régionale

En plus de `useI18n()`, le SDK Vue exporte des primitives de langue de bas niveau pour les intégrations avancées :

- `locale`
- `localeSetting`
- `setLocale()`
- `AVAILABLE_LOCALES`
- `LOCALE_LABELS`

Utilisez-les pour accéder directement aux stores, pour intégrer l’état de la langue à une application plus large, ou pour obtenir les métadonnées des langues sans vous abonner à tout l’objet renvoyé par `useI18n()`.

## Utilisation

```ts
import { locale, localeSetting, setLocale, AVAILABLE_LOCALES, LOCALE_LABELS } from '@pairdraw/vue/i18n'
```

## Remarques

- `locale` est le store de la langue active résolue.
- `localeSetting` est le store de la préférence enregistrée de l’utilisateur.
- `setLocale()` met à jour à la fois la préférence et la langue active.
- `AVAILABLE_LOCALES` et `LOCALE_LABELS` servent à construire des sélecteurs de langue personnalisés.

## Voir aussi

- [useI18n](../composables/use-i18n)
