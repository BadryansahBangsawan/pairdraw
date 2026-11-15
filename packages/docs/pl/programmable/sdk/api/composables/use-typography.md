---
title: useTypography
description: Odczytywanie i zmiana czcionki, wyrównania, wielkości liter, obcinania i funkcji OpenType obiektów tekstowych.
---

# useTypography

`useTypography()` to composable sterujący właściwościami tekstu w panelach edycji tekstu. Działa na warstwach tekstowych w zaznaczeniu: `nodes` zawiera je wszystkie, `node` to pierwsza z nich, a każde działanie zmienia je wszystkie w jednym kroku cofania, więc przy zaznaczeniu tekstu i innych warstw edytowany jest tylko tekst.

Udostępnia:

- rodzinę czcionki;
- styl czcionki: `faces`, czyli kroje rodziny zaznaczonych warstw pod nazwami, które nadają im same czcionki (Book i Roman w Avenirze są rozróżniane), odczytane z zainstalowanych czcionek i dostawców czcionek internetowych, a dopóki kroje rodziny są nieznane, wszystkie standardowe grubości; `faceName`, krój wspólny dla warstw albo `MIXED`; oraz `setFace(style)`, które ustawia krój po nazwie;
- rozmiar czcionki;
- stan formatowania;
- informację o brakujących czcionkach;
- wyrównanie poziome i pionowe, w tym justowanie;
- wielkość liter i kierunek tekstu;
- obcinanie na końcu i maksymalną liczbę wierszy;
- przełączniki funkcji OpenType;
- osie czcionek zmiennych (`axes`, `opticalSizeAuto`);
- styl listy (`listType`, `null`, gdy akapity się różnią) i listy z wysunięciem;
- funkcje zmiany rodziny, kroju, grubości, wyrównania i dekoracji;
- `merged(key)` i `fontFeature(tag)`, które zwracają wspólną wartość albo `MIXED`.

## Użycie

```ts
import { useTypography } from '@pairdraw/vue/controls/typography'

const typography = useTypography()
```

## Podstawowy przykład

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

## Praktyczne przykłady

### Ładowanie i zmiana rodziny czcionki

```ts
const typography = useTypography({
  fontLoader: {
    load: async (family, style) => {
      await myFontLoader(family, style)
    },
  },
})
```

### Przełączanie formatowania

Tak jak w Figmie zmiana rodziny zachowuje grubość i pochylenie każdej warstwy, jeśli nowa rodzina je ma, a w przeciwnym razie wybiera najbliższą grubość o tym samym pochyleniu. `toggleBold` i `toggleItalic` pozostawiają warstwę bez zmian, gdy jej rodzina nie ma takiego kroju.

```ts
typography.toggleBold()
typography.toggleItalic()
typography.toggleDecoration('UNDERLINE')
typography.setTextCase('UPPER')
typography.setVerticalAlign('CENTER')
typography.setTruncation('ENDING')
typography.setFontFeature('LIGA', false)
```

### Tworzenie listy

Podczas edycji tekstu `setListType` i `setParagraphSpacing` zmieniają akapity pod kursorem lub w zaznaczeniu; poza edycją zmieniają cały tekst. `paragraphSpacing(field)` odczytuje dla tych akapitów `listSpacing`, `paragraphSpacing` lub `paragraphIndent` (`MIXED`, gdy się różnią), a `previewParagraphSpacing` pokazuje wartość podczas przeciągania pola bez tworzenia kroku cofania.

```ts
typography.setListType('UNORDERED')
typography.setHangingList(true)
typography.setParagraphSpacing('listSpacing', 8)
```

### Ustawianie osi czcionek zmiennych

`axes` wymienia osie zmiennej czcionki zaznaczonego tekstu, każdą z `tag`, `name`, zakresem i `value`, w jakiej jest rysowana (`MIXED`, gdy warstwy się różnią); lista jest pusta dla czcionki statycznej lub warstw z różnych rodzin. `previewAxis` pokazuje wartość podczas przeciągania, `setAxis` ustawia ją w jednym kroku cofania, a `setOpticalSizeAuto` każe rozmiarowi optycznemu podążać za rozmiarem czcionki albo go zatrzymuje. Zmiana grubości, pochylenia lub rodziny przywraca osie danej odmiany.

```ts
typography.setAxis('wght', 560)
typography.setOpticalSizeAuto(false)
```

## Zobacz też

- [useTextEdit](./use-text-edit)
- [useSelectionState](./use-selection-state)
