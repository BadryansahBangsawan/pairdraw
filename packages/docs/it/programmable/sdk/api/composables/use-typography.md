---
title: useTypography
description: Leggere e aggiornare font, allineamento, maiuscole, troncamento e funzionalità OpenType dei nodi di testo.
---

# useTypography

`useTypography()` è il composable delle proprietà del testo per i pannelli di modifica del testo. Lavora sui livelli di testo della selezione: `nodes` li contiene, `node` è il primo e ogni azione li modifica tutti in un solo passo di annullamento, quindi una selezione che mescola testo e altri livelli modifica solo il testo.

Espone:

- la famiglia di font
- lo stile del font: `faces`, gli stili della famiglia dei livelli selezionati con i nomi che danno loro i font (in Avenir, Book e Roman restano distinti), letti dai font installati e dai fornitori di web font, con tutti i pesi standard finché gli stili di una famiglia non sono noti; `faceName`, lo stile comune ai livelli oppure `MIXED`; e `setFace(style)`, che imposta uno stile in base al nome
- la dimensione del font
- lo stato della formattazione
- lo stato dei font mancanti
- l'allineamento orizzontale e verticale, compresa la giustificazione
- maiuscole/minuscole e direzione del testo
- il troncamento finale e il numero massimo di righe
- l'attivazione delle funzionalità OpenType
- gli assi dei font variabili (`axes`, `opticalSizeAuto`)
- lo stile degli elenchi (`listType`, `null` quando i paragrafi sono diversi) e gli elenchi con rientro sporgente
- funzioni per cambiare famiglia, stile, peso, allineamento e decorazioni
- `merged(key)` e `fontFeature(tag)`, che restituiscono il valore comune oppure `MIXED`

## Uso

```ts
import { useTypography } from '@pairdraw/vue/controls/typography'

const typography = useTypography()
```

## Esempio di base

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

## Esempi pratici

### Caricare e cambiare una famiglia di font

```ts
const typography = useTypography({
  fontLoader: {
    load: async (family, style) => {
      await myFontLoader(family, style)
    },
  },
})
```

### Attivare la formattazione

Come in Figma, cambiando famiglia ogni livello mantiene peso e inclinazione se la nuova famiglia li offre, altrimenti prende il peso più vicino con la stessa inclinazione; `toggleBold` e `toggleItalic` lasciano invariato un livello quando la sua famiglia non ha lo stile corrispondente.

```ts
typography.toggleBold()
typography.toggleItalic()
typography.toggleDecoration('UNDERLINE')
typography.setTextCase('UPPER')
typography.setVerticalAlign('CENTER')
typography.setTruncation('ENDING')
typography.setFontFeature('LIGA', false)
```

### Creare un elenco

Durante la modifica del testo, `setListType` e `setParagraphSpacing` cambiano i paragrafi sotto il cursore o nella selezione; altrimenti cambiano tutto il testo. `paragraphSpacing(field)` legge `listSpacing`, `paragraphSpacing` o `paragraphIndent` per quei paragrafi, restituendo `MIXED` quando sono diversi, e `previewParagraphSpacing` mostra un valore mentre si trascina un campo, senza creare un passo di annullamento.

```ts
typography.setListType('UNORDERED')
typography.setHangingList(true)
typography.setParagraphSpacing('listSpacing', 8)
```

### Impostare gli assi dei font variabili

`axes` elenca gli assi del font variabile del testo selezionato, ciascuno con `tag`, `name`, intervallo e il `value` con cui viene disegnato (`MIXED` quando i livelli sono diversi); è vuoto per un font statico o per livelli di famiglie diverse. `previewAxis` mostra un valore mentre si trascina un campo, `setAxis` lo imposta in un solo passo di annullamento e `setOpticalSizeAuto` fa seguire alla dimensione ottica la dimensione del font oppure la blocca. Cambiare peso, inclinazione o famiglia riporta gli assi ai valori propri dello stile.

```ts
typography.setAxis('wght', 560)
typography.setOpticalSizeAuto(false)
```

## Vedi anche

- [useTextEdit](./use-text-edit)
- [useSelectionState](./use-selection-state)
