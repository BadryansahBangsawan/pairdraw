---
title: Przeglądanie dokumentów
description: Przeglądanie drzewa obiektów, wyszukiwanie według nazwy lub typu i analiza właściwości z terminala.
---

# Przeglądanie dokumentów

CLI pozwala analizować dokumenty projektu bez uruchamiania edytora. Każde polecenie działa też z uruchomioną aplikacją — wystarczy pominąć argument z plikiem.

::: tip Instalacja

```sh
npm install -g @pairdraw/cli
# or
bun add -g @pairdraw/cli
```

:::

## Informacje o dokumencie

Szybki przegląd — liczba stron, łączna liczba obiektów, używane czcionki, rozmiar pliku:

```sh
pairdraw info design.fig
```

## Diagnostyka czcionek {#font-diagnostics}

Raport o żądanych krojach czcionek, dostępnych źródłach, zamiennikach i warstwach, których to dotyczy:

```sh
pairdraw fonts design.fig
pairdraw fonts design.fig --json
pairdraw fonts --document-id tab-123 --page-id 0:1
```

Tryb plikowy sprawdza wszystkie strony dokumentu, korzystając z czcionek dostępnych na komputerze z CLI, bez pobierania czcionek z sieci. Tryb pracy z aplikacją raportuje wskazany dokument i stronę w aplikacji, której wczytane czcionki mogą się różnić od tych na komputerze z CLI. Kroje są oznaczane jako `available`, `substituted` lub `unresolved`; wyjście JSON zawiera `faithful`, `faces` i `issues`.

Użyj [zasad zastępowania czcionek przy eksporcie](./exporting#font-substitution-policy), aby ostrzegać o zamiennikach lub je odrzucać podczas eksportu rastrowego i PDF z pliku.

## Drzewo obiektów

Wypisanie pełnej hierarchii obiektów:

```sh
pairdraw tree design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

## Wyszukiwanie obiektów

Według typu:

```sh
pairdraw find design.fig --type TEXT
```

Według nazwy:

```sh
pairdraw find design.fig --name "Button"
```

Obie flagi można łączyć, aby dodatkowo zawęzić wyniki.

## Zapytania XPath

Selektory XPath wyszukują obiekty według typu, atrybutów i struktury drzewa:

```sh
pairdraw query design.fig "//FRAME"
```

### Przydatne wzorce

**Według typu:**

```sh
pairdraw query design.fig "//TEXT"                    # All text nodes
pairdraw query design.fig "//COMPONENT"               # All components
pairdraw query design.fig "//INSTANCE"                # All instances
```

**Według atrybutów:**

```sh
pairdraw query design.fig "//FRAME[@width < 300]"                # Frames under 300px wide
pairdraw query design.fig "//*[@cornerRadius > 0]"               # Rounded corners
pairdraw query design.fig "//*[@visible = false]"                # Hidden nodes
pairdraw query design.fig "//TEXT[@fontSize >= 24]"              # Large text
pairdraw query design.fig "//*[@opacity < 1]"                    # Semi-transparent nodes
```

**Według nazwy i treści tekstu:**

```sh
pairdraw query design.fig "//TEXT[contains(@name, 'Button')]"    # Name contains 'Button'
pairdraw query design.fig "//TEXT[contains(@text, 'Hello')]"     # Text content contains 'Hello'
```

**Według hierarchii:**

```sh
pairdraw query design.fig "//SECTION//TEXT"            # Text inside sections
pairdraw query design.fig "//FRAME/TEXT"               # Direct text children of frames
pairdraw query design.fig "//COMPONENT_SET//INSTANCE"  # Instances inside component sets
```

### Atrybuty dostępne w zapytaniach

`name`, `width`, `height`, `x`, `y`, `visible`, `opacity`, `cornerRadius`, `fontSize`, `fontFamily`, `fontWeight`, `layoutMode`, `itemSpacing`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `strokeWeight`, `rotation`, `locked`, `blendMode`, `text`, `lineHeight`, `letterSpacing`

### Przykładowy wynik

```
  Found 5 nodes

[0] [frame] "Logo  92×32" (0:9)
[1] [frame] "logo-short-6  31×32" (0:10)
[2] [frame] "wrapper  128×73" (0:20)
[3] [frame] "pen-drawing  148×52" (0:21)
[4] [frame] "surprised-emoji  32×32" (0:26)
```

## Właściwości obiektu

Wszystkie właściwości obiektu o podanym identyfikatorze:

```sh
pairdraw node design.fig --id 1:23
```

## Strony

Lista wszystkich stron dokumentu:

```sh
pairdraw pages design.fig
```

## Zmienne

Lista zmiennych projektu i ich kolekcji:

```sh
pairdraw variables design.fig
```

## Praca z uruchomioną aplikacją

Gdy aplikacja na komputer jest uruchomiona, pomiń argument z plikiem — CLI połączy się przez RPC i będzie działać na żywym obszarze roboczym:

```sh
pairdraw documents list    # list open document/page IDs
pairdraw tree              # inspect the active live document
pairdraw tree --document-id tab-123 --page-id 0:1
pairdraw eval --document-id tab-123 --page-id 0:1 -c "..."
```

W procesach agentów użyj `pairdraw documents list --json`, a potem jawnie przekazuj `--document-id` i `--page-id`, zamiast polegać na widocznej aktywnej karcie i stronie. Otwieranie, zapisywanie, przełączanie i zamykanie dokumentów, cofanie zmian, zmianę ustawień i wywoływanie dowolnych narzędzi edytora opisuje strona [Sterowanie aplikacją](/programmable/cli/app-control).

## Lint projektów

Sprawdzanie dokumentów pod kątem problemów z nazwami, układem, strukturą i dostępnością:

```sh
pairdraw lint design.fig
pairdraw lint design.pen --preset strict
pairdraw lint design.fig --rule color-contrast
pairdraw lint design.fig --list-rules
pairdraw lint design.fig --fix -o fixed.fig
```

Użyj `--json`, aby otrzymać wynik do przetwarzania maszynowego; każdy komunikat zawiera swoje `fix` i `suggestions` jako dane. `--fix` stosuje bezpieczne poprawki — wiąże kolory z pasującą zmienną koloru i zaokrągla geometrię do pełnych pikseli — a wynik zapisuje w pliku `.fig` podanym w `-o`.

## Wyjście JSON

Wszystkie polecenia obsługują `--json`, które zwraca wynik do przetwarzania maszynowego — przekaż go do `jq`, skryptów CI lub innych narzędzi:

```sh
pairdraw tree design.fig --json | jq '.[] | .name'
```
