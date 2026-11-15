---
title: Analiza projektu
description: Sprawdzanie kolorów, typografii, odstępów i powtarzających się struktur w plikach .fig.
---

# Analiza projektu

Polecenia `analyze` sprawdzają cały system projektowy z terminala: znajdują niespójności, wyodrębniają rzeczywistą paletę i wykrywają struktury, które czekają na przekształcenie w komponenty.

## Kolory

```sh
pairdraw analyze colors design.fig
```

Polecenie znajduje wszystkie kolory w pliku, liczy ich użycia i pokazuje histogram:

```
#1d1b20  ██████████████████████████████ 17155×
#49454f  ██████████████████████████████ 9814×
#ffffff  ██████████████████████████████ 8620×
#6750a4  ██████████████████████████████ 3967×
```

## Typografia

```sh
pairdraw analyze typography design.fig
```

Wynik zawiera wszystkie kombinacje rodziny, rozmiaru i grubości czcionki wraz z liczbą użyć. Pozwala to znaleźć jednorazowe style tekstu, które warto ujednolicić.

## Odstępy

```sh
pairdraw analyze spacing design.fig
```

Polecenie sprawdza wartości odstępów i dopełnienia w ramkach z automatycznym układem. Pomaga wykryć niespójności skali odstępów — na przykład przypadkowy odstęp `13px` pośród wartości `8/16/24`.

## Powtarzające się struktury

```sh
pairdraw analyze clusters design.fig
```

Polecenie znajduje powtarzające się układy obiektów, które można przekształcić w komponenty:

```
3771× frame "container" (100% match)
     size: 40×40, structure: Frame > [Frame]

2982× instance "Checkboxes" (100% match)
     size: 48×48, structure: Instance > [Frame]
```

## Wyjście JSON

Wszystkie polecenia `analyze` obsługują `--json`, które zwraca wynik do przetwarzania maszynowego:

```sh
pairdraw analyze colors design.fig --json
```

Przekaż wynik do `jq`, użyj go w testach CI albo w skryptach pilnujących budżetu tokenów projektu.
