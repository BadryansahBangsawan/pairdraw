---
title: LayoutControlsRoot
description: Komponente ohne vorgegebenes Erscheinungsbild für automatische Anordnung und Größenmodi.
---

<script setup lang="ts">
import { data } from '#docs-api/components/layout-controls-root.data'
</script>

# LayoutControlsRoot

`LayoutControlsRoot` gibt die API von `useLayout()` als strukturelle Komponente über seinen Slot weiter. Damit lässt sich ein wiederverwendbares Panel für Anordnung und Größe mit eigenem Markup bauen.

Die Felder für Breite und Höhe können bearbeitbar bleiben, während ihre Achse Hug oder Fill verwendet. Bei der ersten tatsächlichen Änderung des Zahlenwerts zeichnet `updateAxisSize()` den Wechsel des Größenmodus auf und stellt diese Achse auf Fixed um. Soll der Wechsel des Größenmodus, das Lösen einer Variablenbindung und der neue Zahlenwert als ein einziger Rückgängig-Schritt gespeichert oder zurückgenommen werden, kombinieren Sie das Feld mit `BindableValue` und einem Provider, der Interaktions-Batches unterstützt. Fokussieren und das Öffnen der Auswahl ändern den Größenmodus nicht.

Für Menüs zur Größe verwenden Sie `setAxisSizing('width', mode)` oder `setAxisSizing('height', mode)`. Die älteren Setter für einzelne Achsen gehören nicht mehr zum aktuellen Vertrag.

## Generierte API-Referenz

Die folgenden Tabellen werden beim Erstellen der Dokumentation aus dem Vue-Quellcode und JSDoc erzeugt.

<SdkComponentAPI :components="data.components" />

## Siehe auch

- [useLayout](../composables/use-layout)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [Eigenschaften-Panels](../../guides/property-panels)
