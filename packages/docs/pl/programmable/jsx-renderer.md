---
title: Renderer JSX
description: Tworzenie edytowalnych projektów za pomocą tej samej deklaratywnej biblioteki, której używają agenci Pairdraw.
---

# Renderer JSX

Projektowy JSX w Pairdraw tworzy obiekty sceny, a nie DOM przeglądarki. Do budowy edytowalnych projektów możesz używać czytelnych drzew komponentów, wyrażeń JavaScript i funkcji wielokrotnego użytku.

## Tworzenie projektów

Narzędzie `render` przyjmuje ciągi JSX w czacie AI i MCP. W kodzie aplikacji lub bibliotece działającej bez interfejsu zaimportuj `Frame`, `Text` i pozostałe elementy do tworzenia projektu z `@pairdraw/design-jsx`, a potem twórz obiekty przez `renderTree` lub `renderJSX` z `@pairdraw/core/design-jsx`, które dodają ikony, konwersję SVG i układ. Aby zapisywać drzewa jako TSX, ustaw w `tsconfig.json` `"jsxImportSource": "@pairdraw/design-jsx"` wraz z `"jsx": "react-jsx"` albo dodaj do pliku komentarz `/** @jsxImportSource @pairdraw/design-jsx */`. Środowisko skryptowe określa, które API są dostępne w `eval`; eksporty pakietów nie są tam automatycznie zmiennymi globalnymi.

[Wspólna dokumentacja tworzenia projektów](/reference/design-authoring) zawiera wykonywalne przykłady, wskazówki dotyczące układu i spis obsługiwanej składni. Jest generowana z tego samego źródła, z którego korzystają czat, ACP, prompty generowania kodu i instalowalna umiejętność agenta.

## Elementy

Do kompozycji używaj ramek i tekstu, do grafiki obiektów kształtów, a do treści wielokrotnego użytku w edytorze prawdziwych komponentów i instancji. Sama funkcja JavaScript nie nadaje tożsamości komponentu. Zobacz [spis elementów](/reference/design-authoring#supported-syntax-inventory).

## Właściwości stylu

Do rozmiarów zależnych od treści używaj Hug/Fill oraz układu flex lub grid. Zamiast kopiować wartości, wiąż zmienne semantyczne. Zobacz [kompozycja i układ](/reference/design-authoring#composition-and-layout), [farba i tekst](/reference/design-authoring#paint-text-and-artwork) oraz [zmienne i komponenty](/reference/design-authoring#variables-and-components).

## Eksport do JSX

```sh
pairdraw export design.fig -f jsx                   # Pairdraw format
pairdraw export design.fig -f jsx --style tailwind  # Tailwind classes
```

Wyeksportowany JSX Pairdraw można edytować i ponownie wyrenderować w dokumencie. Eksport zapisuje ukryte i zablokowane warstwy, ograniczenia, limity rozmiaru, wielowarstwowe, gradientowe i obrazowe wypełnienia, obwiednie, efekty, maski oraz powiązania ze zmiennymi, więc renderowanie eksportu je odtwarza, a `diff_jsx` pokazuje zmiany każdego z nich. Tekst sformatowany wieloma stylami, ścieżki wektorowe, siatki układu, style współdzielone i definicje właściwości komponentów nie są jeszcze zapisywane. Instancje są zapisywane jako ramki z zawartością, dzięki czemu wyeksportowany JSX jest samodzielny. Zobacz [eksport w CLI](./cli/exporting).

## Porównywanie wizualne

JSX pozwala przeglądać strukturalne zmiany projektu jak kod. Użyj `get_jsx` i `diff_jsx`, aby sprawdzić zmiany, a potem zweryfikuj faktycznie wyrenderowany wynik; czysta różnica strukturalna nie dowodzi równoważności wizualnej.
