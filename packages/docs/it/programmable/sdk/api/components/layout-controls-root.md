---
title: LayoutControlsRoot
description: Componente radice senza stile per i controlli di layout automatico e dimensionamento.
---

<script setup lang="ts">
import { data } from '#docs-api/components/layout-controls-root.data'
</script>

# LayoutControlsRoot

`LayoutControlsRoot` espone come componente strutturale il contratto dello slot restituito da `useLayout()`. Usalo quando vuoi un contenitore riutilizzabile per i controlli del layout con markup deciso dall'applicazione.

I campi di larghezza e altezza possono restare modificabili mentre il loro asse usa **Adatta al contenuto** o **Riempi**. Alla prima modifica numerica effettiva, `updateAxisSize()` registra il cambio di dimensionamento e porta quell'asse a **Fisso**. Componi il campo con `BindableValue` e un provider che supporti i batch di interazione quando modalità di dimensionamento, scollegamento della variabile e valore numerico devono essere confermati o annullati come un unico passo di annullamento. Il focus e l'apertura del selettore non cambiano la modalità di dimensionamento.

Usa `setAxisSizing('width', mode)` o `setAxisSizing('height', mode)` per i menu di dimensionamento. I vecchi setter specifici per asse non fanno parte del contratto attuale.

## Riferimento API generato

Le tabelle seguenti vengono estratte dal sorgente Vue e dal JSDoc durante la build della documentazione.

<SdkComponentAPI :components="data.components" />

## Vedi anche

- [useLayout](../composables/use-layout)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [Guida ai pannelli delle proprietà](../../guides/property-panels)
