---
title: Przeglądanie dokumentów
description: Drzewo obiektów, wyszukiwanie według nazwy i typu oraz właściwości z terminala.
---

# Przeglądanie dokumentów

CLI pozwala analizować dokumenty projektu bez uruchamiania edytora. Te same polecenia działają z otwartą aplikacją komputerową, jeśli nie podasz pliku.

::: tip Instalacja

```sh
npm install -g @pairdraw/cli
# albo
bun add -g @pairdraw/cli
```

:::

## Informacje ogólne

Liczba stron i obiektów, używane czcionki oraz rozmiar pliku:

```sh
pairdraw info design.fig
```

## Drzewo obiektów

```sh
pairdraw tree design.fig
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

## Zapytania XPath

Selektory XPath wyszukują obiekty według typu, atrybutów i położenia w drzewie:

```sh
pairdraw query design.fig "//FRAME"
```

```sh
pairdraw query design.fig "//TEXT"                    # Wszystkie obiekty tekstowe
pairdraw query design.fig "//COMPONENT"               # Wszystkie komponenty
pairdraw query design.fig "//INSTANCE"                # Wszystkie egzemplarze
pairdraw query design.fig "//FRAME[@width < 300]"     # Ramki węższe niż 300 px
pairdraw query design.fig "//*[@cornerRadius > 0]"    # Obiekty z zaokrąglonymi narożnikami
pairdraw query design.fig "//*[@visible = false]"     # Ukryte obiekty
pairdraw query design.fig "//SECTION//TEXT"            # Tekst wewnątrz sekcji
```

Nazwy dostępnych atrybutów, takie jak `fontSize`, `layoutMode` i `strokeWeight`, pozostają zgodne z API.

## Właściwości obiektu

```sh
pairdraw node design.fig --id 1:23
```

## Strony i zmienne

```sh
pairdraw pages design.fig
pairdraw variables design.fig
```

## Praca z otwartą aplikacją

Jeśli aplikacja komputerowa jest uruchomiona, nie podawaj ścieżki pliku. CLI połączy się przez RPC z otwartym dokumentem:

```sh
pairdraw documents list
pairdraw tree
pairdraw tree --document-id tab-123 --page-id 0:1
pairdraw eval --document-id tab-123 --page-id 0:1 -c "..."
```

W procesach automatycznych najpierw wywołaj `pairdraw documents list --json`, a potem jawnie przekazuj `--document-id` i `--page-id`. Otwieranie, zapisywanie, przełączanie i zamykanie dokumentów, cofanie zmian, ustawienia i wywoływanie dowolnych narzędzi edytora opisuje [Controlling the App](/programmable/cli/app-control).

## Kontrola jakości

Sprawdzanie nazw, układu, struktury i dostępności:

```sh
pairdraw lint design.fig
pairdraw lint design.pen --preset strict
pairdraw lint design.fig --rule color-contrast
pairdraw lint design.fig --list-rules
pairdraw lint design.fig --fix -o fixed.fig
```

Wyjście `--json` zawiera dla każdego komunikatu dane `fix` i `suggestions`. Opcja `--fix` stosuje bezpieczne poprawki — wiąże kolory z pasującą zmienną koloru i zaokrągla geometrię do pełnych pikseli — a wynik zapisuje w pliku `.fig` podanym w `-o`.

## Wyjście JSON

Wszystkie polecenia obsługują `--json`. Wynik można przekazać do `jq`, CI albo innego programu.
