---
title: Edycja wektorów
description: 'Edycja geometrii ścieżki wektorowej: punkty, uchwyty Béziera, modyfikatory i działania Pióra w trybie edycji.'
---

# Edycja wektorów

Tryb edycji wektorów pozwala zmieniać **geometrię** krzywej: położenie punktów, kształt segmentów i uchwyty Béziera.
W tym trybie edytujesz samą ścieżkę, a nie zwykłe transformacje obiektu.

## Włączanie trybu edycji

- Zaznacz obiekt wektorowy narzędziem Przesuń.
- **Kliknij dwukrotnie krzywą**.

Włącza to edycję geometrii zaznaczonego wektora.

## Wychodzenie z trybu edycji

- Naciśnij <kbd>Escape</kbd>.
- Kliknij pusty obszar roboczy.
- Albo przejdź do innego kontekstu edycji.

## Co zmienia się w tym trybie

- Zwykła ramka transformacji obiektu jest wyłączona.
- Można edytować punkty, segmenty i uchwyty.
- Kursor nie przełącza się na zmianę rozmiaru ani obrót w narożnikach ramki ograniczającej warstwy; przełącza się nad ramką transformacji zaznaczonych punktów (patrz [Transformacja zaznaczonych punktów](#transform-selected-points)).

## Podstawowe operacje

### Przesuwanie punktu

- Przeciągnij punkt.
- Połączone segmenty i kształt ścieżki zmieniają się na żywo w podglądzie.

### Edycja uchwytu Béziera

- Przeciągnij uchwyt przy punkcie.
- Domyślne zachowanie zależy od bieżącego układu uchwytów punktu.

### Zaznaczanie i przesuwanie segmentu

- Kliknij segment, aby go zaznaczyć. Segment zmienia kolor na niebieski i pokazuje gałkę pośrodku; jego punkty pozostają niezaznaczone.
- <kbd>Shift</kbd> + kliknięcie dodaje segment do zaznaczenia albo usuwa zaznaczony.
- Przeciągnij segment, aby przesunąć dwa łączone przez niego punkty razem z resztą zaznaczenia.

### Zaznaczanie prostokątem

- Przeciągnij po pustym miejscu, aby zaznaczyć punkty wewnątrz prostokąta i segmenty między nimi.
- <kbd>Shift</kbd> + przeciąganie dodaje je do zaznaczenia.

### Zaznaczanie obszaru

- Umieść wskaźnik wewnątrz wypełnionego obszaru: obszar pod nim zostaje zakreskowany ukośnymi liniami.
- Kliknij wewnątrz, aby zaznaczyć obszar i wszystkie jego punkty; przeciągnij, aby go przesunąć.
- <kbd>Shift</kbd> + kliknięcie dodaje obszar do zaznaczenia.

### Usuwanie punktów i segmentów

- Naciśnij <kbd>Delete</kbd> lub <kbd>Backspace</kbd>, aby usunąć zaznaczenie.
- Usunięty punkt zabiera ze sobą swoje segmenty.
- Usunięty segment zabiera tylko punkty, które pozostawia niepołączone, więc usunięcie środkowego segmentu ścieżki dzieli ją na dwie.
- Usunięcie wszystkiego usuwa warstwę.

## Cięcie, łączenie i zmiana kształtu

| Działanie | macOS | Windows / Linux |
| --------- | ----- | --------------- |
| Narzędzie cięcia | <kbd>X</kbd> | <kbd>X</kbd> |
| Punkt gładki lub narożny | Dwukrotne kliknięcie punktu | Dwukrotne kliknięcie punktu |
| Wyprostowanie segmentu | <kbd>Cmd</kbd> + dwukrotne kliknięcie | <kbd>Ctrl</kbd> + dwukrotne kliknięcie |
| Wygięcie segmentu | <kbd>Cmd</kbd> + przeciągnięcie segmentu | <kbd>Ctrl</kbd> + przeciągnięcie segmentu |
| Wygięcie z zachowaniem sąsiadów | <kbd>Cmd</kbd> + <kbd>Option</kbd> + przeciągnięcie | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + przeciągnięcie |
| Połączenie dwóch punktów końcowych | <kbd>Cmd</kbd> + <kbd>J</kbd> | <kbd>Ctrl</kbd> + <kbd>J</kbd> |
| Duplikowanie punktów | <kbd>Option</kbd> + przeciągnięcie | <kbd>Alt</kbd> + przeciągnięcie |
| Przesuwanie punktów | Klawisze strzałek | Klawisze strzałek |

- **Narzędzie cięcia:** naciśnij <kbd>X</kbd>, a potem kliknij segment, aby go w tym miejscu przeciąć, albo punkt, aby rozdzielić spotykające się w nim segmenty. Krzywe zachowują kształt, a przecięty kształt zamknięty przestaje być wypełniony. <kbd>X</kbd>, <kbd>Escape</kbd> lub klawisz innego narzędzia odkłada narzędzie.
- **Punkt gładki lub narożny:** dwukrotne kliknięcie punktu narożnego daje mu uchwyty wzdłuż linii między sąsiadami, a dwukrotne kliknięcie punktu gładkiego usuwa jego uchwyty.
- **Wyprostowanie:** <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + dwukrotne kliknięcie zakrzywionego segmentu usuwa oba jego uchwyty.
- **Łączenie:** zaznacz dwa punkty końcowe i naciśnij <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>J</kbd>. Punkty w tym samym miejscu stają się jednym punktem; odległe łączy prosty segment. Połączenie obu końców jednej ścieżki zamyka ją i wypełnia. Podczas edycji ścieżki ten skrót łączy punkty zamiast otwierać czat.
- **Duplikowanie:** przytrzymaj <kbd>Option</kbd>/<kbd>Alt</kbd> i przeciągnij zaznaczone punkty lub segmenty, aby przeciągnąć kopię. Kopia pojedynczego punktu pozostaje z nim połączona, więc przeciąganie wydłuża ścieżkę.
- **Przesuwanie strzałkami:** klawisze strzałek przesuwają zaznaczone punkty o odległość ustawioną w Ustawienia → Edytor, a <kbd>Shift</kbd> + strzałka o duże przesunięcie.
- **Wyginanie:** <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + przeciągnięcie segmentu wygina go tak, że chwycone miejsce podąża za wskaźnikiem. Gładki punkt końcowy pozostaje gładki, a jego drugi uchwyt obraca się razem z nim. Dodaj <kbd>Option</kbd>/<kbd>Alt</kbd>, aby uchwyty sąsiednich segmentów zostały na miejscu; punkty końcowe stają się wtedy narożnikami.

## Transformacja zaznaczonych punktów {#transform-selected-points}

Gdy zaznaczone są dwa punkty lub segmenty, otacza je ramka transformacji.

- Przeciągnij róg lub krawędź, aby skalować zaznaczone punkty od przeciwnej strony. Przytrzymaj <kbd>Shift</kbd>, aby zachować proporcje, i <kbd>Option</kbd>/<kbd>Alt</kbd>, aby skalować od środka.
- Przeciągnij tuż za rogiem, aby obrócić je wokół środka ramki. Przytrzymaj <kbd>Shift</kbd>, aby obracać co 15°.
- Punkty i segmenty pod wskaźnikiem można nadal przeciągać ponad ramką, a każdą transformację cofa się jednym krokiem.

## Modyfikatory przeciągania uchwytów

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Ciągły (gładki / ciągły) | <kbd>Cmd</kbd> + przeciągnięcie | <kbd>Ctrl</kbd> + przeciągnięcie |
| Narożny (niezależne uchwyty) | <kbd>Option</kbd> + przeciągnięcie | <kbd>Alt</kbd> + przeciągnięcie |
| Zablokowany kierunek (tylko długość) | <kbd>Shift</kbd> + przeciągnięcie | <kbd>Shift</kbd> + przeciągnięcie |

### Tryb ciągły: <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + przeciągnięcie

- Aktywny uchwyt pozostaje na jednej linii z uchwytem bliźniaczym.
- Zmienia się tylko długość aktywnego uchwytu.
- Służy do płynnych przejść bez załamania w narożniku.

### Tryb narożny: <kbd>Option</kbd>/<kbd>Alt</kbd> + przeciągnięcie

- Aktywny uchwyt jest edytowany niezależnie.
- Uchwyt bliźniaczy pozostaje na miejscu.
- Służy do tworzenia ostrego przejścia w narożniku.

### Zablokowany kierunek: <kbd>Shift</kbd> + przeciągnięcie

Dla punktów o układzie **Continuous** lub **Symmetric**:

- kierunek uchwytu jest zablokowany na wartości sprzed **rozpoczęcia bieżącego przeciągania**;
- przeciąganie zmienia tylko długość uchwytu (lub uchwytów, zależnie od układu).

## Zmiana wygięcia przez przeciągnięcie punktu

Gdy przeciągasz punkt z wciśniętym <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>, edytor wybiera docelowy uchwyt na podstawie **kierunku dołączenia segmentu** w tym punkcie (a nie odległości od najbliższego sąsiedniego punktu).
Działa to również dla rozgałęzionych punktów w sieci wektorowej: po wybraniu docelowy uchwyt pozostaje zablokowany do końca bieżącego przeciągania.

## Pióro w trybie edycji

Gdy aktywne jest narzędzie Pióro:

- **Kliknij segment**, aby wstawić nowy punkt (podzielić segment).
- **Kliknij punkt końcowy otwartej ścieżki**, aby wznowić rysowanie od tego punktu.
- **Option/Alt + kliknięcie punktu** usuwa go (jeśli pozwala na to topologia).

Tworzenie i zamykanie ścieżek opisano na stronie [Narzędzie Pióro](./pen-tool.md).

## Praktyczny przebieg pracy

1. Narysuj kształt narzędziem Pióro.
2. Kliknij dwukrotnie krzywą, aby włączyć tryb edycji wektorów.
3. Przesuwaj punkty, aby dopracować sylwetkę.
4. Przeciągaj uchwyty:
   - z <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> dla płynnych, ciągłych przejść,
   - z <kbd>Option</kbd>/<kbd>Alt</kbd> dla niezależnej edycji,
   - z <kbd>Shift</kbd> dla zmiany samej długości.
5. Naciśnij <kbd>Escape</kbd>, aby wyjść.
