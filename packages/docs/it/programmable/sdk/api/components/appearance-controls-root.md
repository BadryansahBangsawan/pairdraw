---
title: AppearanceControlsRoot
description: Componente radice senza stile per i controlli di opacità, visibilità, metodo di fusione, raggio degli angoli e smussatura.
---

<script setup lang="ts">
import { data } from '#docs-api/components/appearance-controls-root.data'
</script>

# AppearanceControlsRoot

`AppearanceControlsRoot` espone come componente strutturale il contratto dello slot restituito da `useAppearance()`. Usalo quando vuoi controlli dell'aspetto riutilizzabili con una presentazione personalizzata.

Il componente radice prende le decisioni di presentazione che derivano dalla selezione, compreso `showIndependentCorners`. Questo stato si attiva quando il nodo selezionato usa esplicitamente angoli indipendenti, oppure quando un nodo importato ha valori degli angoli diversi tra loro ma un flag uniforme non aggiornato. Chi usa il componente dovrebbe disegnare l'interfaccia a partire da questo stato invece di mantenere un proprio ref locale per l'espansione.

`cornerSmoothingPercent` espone il valore normalizzato della scena come `0…100` oppure `MIXED`. Per aggiornarlo usa le azioni sugli angoli con valori normalizzati `0…1`.

Su più nodi, l'attivazione degli angoli indipendenti, le modifiche alla smussatura e le conferme dei singoli angoli vengono raggruppate in un'unica voce di annullamento, conservando il valore originale di ciascun nodo.

## Riferimento API generato

Le tabelle seguenti vengono estratte dal sorgente Vue e dal JSDoc durante la build della documentazione.

<SdkComponentAPI :components="data.components" />

## Vedi anche

- [useAppearance](../composables/use-appearance)
- [Guida ai pannelli delle proprietà](../../guides/property-panels)
