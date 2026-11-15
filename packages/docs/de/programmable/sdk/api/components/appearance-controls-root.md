---
title: AppearanceControlsRoot
description: Komponente ohne vorgegebenes Erscheinungsbild für Deckkraft, Sichtbarkeit, Mischmodus, Eckenradius und Eckenglättung.
---

<script setup lang="ts">
import { data } from '#docs-api/components/appearance-controls-root.data'
</script>

# AppearanceControlsRoot

`AppearanceControlsRoot` gibt Zustand und Aktionen aus `useAppearance()` als strukturelle Komponente über seinen Slot weiter. Damit lassen sich wiederverwendbare Felder für das Erscheinungsbild mit eigener Darstellung bauen.

Die Komponente trifft Darstellungsentscheidungen, die sich aus der Auswahl ergeben, darunter `showIndependentCorners`. Dieser Zustand wird aktiv, wenn das ausgewählte Objekt ausdrücklich unabhängige Ecken verwendet oder wenn ein importiertes Objekt ungleiche Eckenwerte zusammen mit einer veralteten Markierung für einheitliche Ecken enthält. Eigene Oberflächen sollten aus diesem Zustand rendern, statt eine parallele lokale Referenz für das Aufklappen zu pflegen.

`cornerSmoothingPercent` liefert den normalisierten Wert aus der Szene als `0…100` oder `MIXED`. Geändert wird er über die Eckenaktionen mit normalisierten Werten von `0…1`.

Das Umschalten unabhängiger Ecken für mehrere Objekte, Änderungen der Glättung und das Speichern einzelner Ecken werden zu einem Eintrag im Rückgängig-Verlauf zusammengefasst; der ursprüngliche Wert jedes Objekts bleibt dabei erhalten.

## Generierte API-Referenz

Die folgenden Tabellen werden beim Erstellen der Dokumentation aus dem Vue-Quellcode und JSDoc erzeugt.

<SdkComponentAPI :components="data.components" />

## Siehe auch

- [useAppearance](../composables/use-appearance)
- [Eigenschaften-Panels](../../guides/property-panels)
