---
title: Edycja wektorów
description: Edycja punktów, uchwytów Béziera i segmentów oraz używanie Pióra w trybie edycji.
---

# Edycja wektorów

Tryb edycji wektorów pozwala zmieniać geometrię ścieżki: położenie punktów, kształt segmentów i uchwyty Béziera. Zamiast transformować cały obiekt, edytujesz samą ścieżkę.

## Włączanie trybu edycji

1. Wybierz obiekt wektorowy narzędziem Zaznaczenie.
2. Kliknij dwukrotnie krzywą.

Aby zakończyć edycję, naciśnij <kbd>Escape</kbd> albo przejdź do innego trybu.

## Zachowanie interfejsu

- Ramka transformacji jest ukryta.
- Można wybierać i zmieniać punkty, segmenty oraz uchwyty.
- Narożniki ramki nie aktywują zmiany rozmiaru ani obrotu.

## Podstawowe operacje

### Przesuwanie punktu

Przeciągnij punkt. Połączone segmenty i kształt ścieżki zmieniają się podczas przeciągania.

### Edycja uchwytu Béziera

Przeciągnij uchwyt przy punkcie. Domyślne zachowanie zależy od aktualnego typu punktu.

## Modyfikatory uchwytów

| Operacja | macOS | Windows / Linux |
|----------|-------|-----------------|
| Ciągły | <kbd>Cmd</kbd> + przeciągnięcie | <kbd>Ctrl</kbd> + przeciągnięcie |
| Narożny, niezależne uchwyty | <kbd>Option</kbd> + przeciągnięcie | <kbd>Alt</kbd> + przeciągnięcie |
| Zablokowany kierunek | <kbd>Shift</kbd> + przeciągnięcie | <kbd>Shift</kbd> + przeciągnięcie |

### Tryb ciągły

Aktywny uchwyt pozostaje na jednej linii z drugim, zmienia się tylko jego długość, a krzywa zachowuje płynne przejście.

### Tryb narożny

Aktywny uchwyt zmienia się niezależnie, a drugi pozostaje na miejscu. Pozwala to utworzyć ostre przejście.

### Zablokowany kierunek

Dla punktów typu **Continuous** albo **Symmetric** przytrzymanie <kbd>Shift</kbd> blokuje kierunek zapisany przed rozpoczęciem przeciągania. Zmienia się tylko długość jednego lub obu uchwytów.

## Zmiana wygięcia przez przeciągnięcie punktu

Gdy przeciągasz punkt z wciśniętym <kbd>Cmd</kbd> albo <kbd>Ctrl</kbd>, edytor wybiera właściwy uchwyt na podstawie kierunku dołączonego segmentu, a nie odległości od najbliższego punktu.

Działa to również dla rozgałęzionych punktów w sieci wektorowej. Po wybraniu docelowy uchwyt nie zmienia się do końca przeciągania.

## Cięcie, łączenie i zmiana kształtu

- <kbd>X</kbd> włącza narzędzie Nożyczki. Kliknij segment, aby go w tym miejscu przeciąć, albo punkt, aby rozdzielić spotykające się w nim segmenty. <kbd>X</kbd>, <kbd>Escape</kbd> lub klawisz innego narzędzia je wyłącza.
- Dwukrotne kliknięcie punktu przełącza go między punktem gładkim a narożnym.
- <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + dwukrotne kliknięcie segmentu usuwa jego uchwyty i prostuje go.
- <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>J</kbd> łączy dwa zaznaczone punkty końcowe: punkty w tym samym miejscu stają się jednym punktem, a odległe łączy prosty segment. Połączenie obu końców ścieżki zamyka ją i wypełnia. Podczas edycji ścieżki ten skrót nie otwiera czatu.
- <kbd>Option</kbd>/<kbd>Alt</kbd> + przeciągnięcie przeciąga kopię zaznaczonych punktów lub segmentów. Kopia pojedynczego punktu pozostaje z nim połączona.
- Klawisze strzałek przesuwają zaznaczone punkty o odległość z Ustawienia → Edytor, a z <kbd>Shift</kbd> o dużą odległość.
- <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + przeciągnięcie segmentu wygina go tak, że chwycone miejsce podąża za wskaźnikiem. Gładki punkt końcowy pozostaje gładki, a jego drugi uchwyt obraca się razem z nim. Z <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>Option</kbd>/<kbd>Alt</kbd> uchwyty sąsiednich segmentów zostają na miejscu, a punkty końcowe stają się narożnikami.
- Gdy zaznaczone są dwa punkty lub segmenty, otacza je ramka transformacji. Przeciągnij róg lub krawędź, aby skalować punkty od przeciwnej strony; z <kbd>Shift</kbd> proporcje zostają zachowane, a z <kbd>Option</kbd>/<kbd>Alt</kbd> skalowanie odbywa się od środka. Przeciągnij tuż za rogiem, aby obrócić je wokół środka ramki, z <kbd>Shift</kbd> co 15°. Każdą transformację cofa się jednym krokiem.

## Pióro w trybie edycji

- Kliknij segment, aby dodać punkt i podzielić segment.
- Kliknij punkt końcowy otwartej ścieżki, aby wznowić rysowanie.
- Kliknij punkt z wciśniętym <kbd>Option</kbd> albo <kbd>Alt</kbd>, aby go usunąć, jeśli pozwala na to topologia.

Tworzenie i zamykanie ścieżek opisano na stronie [Narzędzie Pióro](./pen-tool.md).
