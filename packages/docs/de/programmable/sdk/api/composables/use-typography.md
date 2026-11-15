---
title: useTypography
description: Schrift, Ausrichtung, Groß- und Kleinschreibung, Kürzung und OpenType-Funktionen von Textobjekten lesen und ändern.
---

# useTypography

`useTypography()` ist das Composable für Texteigenschaften in Text-Panels. Es arbeitet mit den Textebenen der Auswahl: `nodes` enthält sie, `node` ist die erste, und jede Aktion ändert alle in einem Undo-Schritt. Bei einer Auswahl aus Text und anderen Ebenen wird also nur der Text bearbeitet.

Es stellt bereit:

- Schriftfamilie
- Schriftschnitt: `faces`, die Schnitte der Familie der ausgewählten Ebenen unter den Namen, die ihre Schriften ihnen geben (bei Avenir etwa Book und Roman getrennt), gelesen aus installierten Schriften und Webfont-Anbietern; solange die Schnitte einer Familie unbekannt sind, jede Standardstärke. Dazu `faceName`, der gemeinsame Schnitt der Ebenen oder `MIXED`, und `setFace(style)`, das einen Schnitt über seinen Namen setzt
- Schriftgröße
- Zustand der Formatierung
- Status fehlender Schriften
- horizontale und vertikale Ausrichtung, einschließlich Blocksatz
- Groß- und Kleinschreibung sowie Textrichtung
- Kürzung am Ende und maximale Zeilenzahl
- Schalter für OpenType-Funktionen
- Achsen variabler Schriften (`axes`, `opticalSizeAuto`)
- Listenstil (`listType`, `null`, wenn die Absätze abweichen) und hängende Listen
- Hilfsfunktionen zum Ändern von Familie, Schnitt, Stärke, Ausrichtung und Dekorationen
- `merged(key)` und `fontFeature(tag)`, die den gemeinsamen Wert oder `MIXED` liefern

## Verwendung

```ts
import { useTypography } from '@pairdraw/vue/controls/typography'

const typography = useTypography()
```

## Einfaches Beispiel

```ts
const {
  fontFamily,
  fontWeight,
  fontSize,
  activeFormatting,
  setFamily,
  setFace,
  setWeight,
  setAlign,
  setVerticalAlign,
  setTextCase,
  setTruncation,
  setFontFeature,
} = useTypography()
```

## Praktische Beispiele

### Schriftfamilie laden und wechseln

```ts
const typography = useTypography({
  fontLoader: {
    load: async (family, style) => {
      await myFontLoader(family, style)
    },
  },
})
```

### Formatierung umschalten

Wie in Figma behält ein Wechsel der Familie Stärke und Neigung jeder Ebene bei, sofern die neue Familie sie hat, und wählt sonst die nächstliegende Stärke mit derselben Neigung. `toggleBold` und `toggleItalic` lassen eine Ebene unverändert, wenn ihre Familie keinen solchen Schnitt hat.

```ts
typography.toggleBold()
typography.toggleItalic()
typography.toggleDecoration('UNDERLINE')
typography.setTextCase('UPPER')
typography.setVerticalAlign('CENTER')
typography.setTruncation('ENDING')
typography.setFontFeature('LIGA', false)
```

### Liste erstellen

Während der Text bearbeitet wird, ändern `setListType` und `setParagraphSpacing` die Absätze unter dem Cursor oder in der Markierung, sonst den ganzen Text. `paragraphSpacing(field)` liest `listSpacing`, `paragraphSpacing` oder `paragraphIndent` dieser Absätze (`MIXED`, wenn sie abweichen), und `previewParagraphSpacing` zeigt einen Wert beim Ziehen eines Felds, ohne einen Undo-Schritt anzulegen.

```ts
typography.setListType('UNORDERED')
typography.setHangingList(true)
typography.setParagraphSpacing('listSpacing', 8)
```

### Achsen variabler Schriften setzen

`axes` listet die Achsen der variablen Schrift des ausgewählten Texts mit `tag`, `name`, Bereich und dem `value`, in dem sie gezeichnet wird (`MIXED`, wenn die Ebenen abweichen); bei statischen Schriften oder verschiedenen Familien ist die Liste leer. `previewAxis` zeigt einen Wert beim Ziehen, `setAxis` setzt ihn in einem Undo-Schritt, und `setOpticalSizeAuto` lässt die optische Größe der Schriftgröße folgen oder hält sie fest. Eine neue Stärke, Neigung oder Familie setzt die Achsen auf die des Schnitts zurück.

```ts
typography.setAxis('wght', 560)
typography.setOpticalSizeAuto(false)
```

## Siehe auch

- [useTextEdit](./use-text-edit)
- [useSelectionState](./use-selection-state)
