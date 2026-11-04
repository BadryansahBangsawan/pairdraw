---
title: Kształty
description: Tworzenie prostokątów, elips, linii, ramek, sekcji, wielokątów i gwiazd w OpenPencil.
---

# Kształty

Dolny pasek narzędzi zawiera narzędzia do tworzenia kształtów, ramek i sekcji. Wybierz narzędzie, a następnie kliknij i przeciągnij wskaźnik po obszarze roboczym.

## Narzędzia

| Narzędzie | Klawisz | Wynik |
|-----------|---------|-------|
| Prostokąt | <kbd>R</kbd> | Prostokąt |
| Elipsa | <kbd>O</kbd> | Elipsa |
| Linia | <kbd>L</kbd> | Linia |
| Ramka | <kbd>F</kbd> | Kontener na inne obiekty |
| Sekcja | <kbd>Shift</kbd> + <kbd>S</kbd> | Kontener najwyższego poziomu przejmujący przecinające się obiekty |

## Umieszczanie obrazów

Wybierz **Plik › Umieść obraz…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd> lub <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>K</kbd> w systemach Windows i Linux) albo kliknij przycisk obrazu na pasku narzędzi i wskaż pliki PNG, JPEG, WebP, GIF, AVIF lub SVG. Pojawią się zaznaczone na środku widoku jako jeden krok, który można cofnąć; plik SVG staje się edytowalnymi warstwami.

Narzędzie **Karteczka** jest na pasku narzędzi zaraz po narzędziu Tekst. Nie ma klawisza, więc <kbd>N</kbd> nadal przybliża do następnej ramki.

## Dodatkowe kształty

W rozwijanym menu dostępne są:

- **Wielokąt:** domyślnie trójkąt o trzech bokach;
- **Gwiazda:** domyślnie pięć ramion i promień wewnętrzny 0,38.

## Rysowanie z ograniczeniami

Przytrzymaj <kbd>Shift</kbd> podczas przeciągania:

- prostokąt stanie się kwadratem;
- elipsa stanie się kołem;
- linia będzie przyciągana do kątów 0°, 45° i 90°.

## Właściwości kształtu

### Zalew

- kolor jednolity wybierany w HSV lub zapisywany szesnastkowo;
- gradient liniowy, radialny, kątowy lub diamentowy;
- obraz jako zalew;
- shader: animowany shader GLSL — zacznij od galerii w wyborze zalewu shaderem, dodaj do niego efekty albo wklej preset skopiowany z shaders.com.

Aby przyciąć lub przekadrować obraz na płótnie, kliknij dwukrotnie warstwę, naciśnij <kbd>Enter</kbd>, gdy jest zaznaczona, albo wybierz **Przytnij obraz** z menu kontekstowego lub z wypełnienia obrazem. Obraz pojawia się w całości, przygaszony poza warstwą. Przeciągnij narożniki lub paski krawędzi warstwy, aby przyciąć ją nad nieruchomym obrazem, przeciągnij obraz, aby przesunąć go pod warstwą, i przeciągnij jego narożne punkty, aby go przeskalować. <kbd>Shift</kbd> zachowuje proporcje lub jedną oś, a <kbd>Alt</kbd> działa od środka. Każde przeciągnięcie to jeden krok do cofnięcia; <kbd>Enter</kbd>, <kbd>Esc</kbd>, dwuklik lub kliknięcie poza obrazem kończy. Wektory, warstwy z dziećmi i warstwy rozmieszczane przez auto layout zachowują swoje krawędzie; w nich możesz tylko przesuwać i skalować obraz.

### Tryb shadera

Tryb shadera pokazuje zalew shaderem osobno i w dużej skali, z odtwarzaniem i pauzą, suwakiem fazy oraz ustawieniami shadera obok. Otwórz go poleceniem **Otwórz w trybie shadera** w wyborze zalewu shaderem albo przez **Widok → Tryb shadera**, gdy zaznaczenie ma zalew shaderem.

### Obwiednia

- wspólna grubość albo osobna dla każdego boku;
- kolor i przezroczystość;
- wyrównanie wewnątrz, pośrodku lub na zewnątrz;
- zakończenia, połączenia i kreskowanie.

### Promień narożników

Promień można ustawić wspólnie lub osobno dla każdego narożnika prostokątów, ramek, komponentów i egzemplarzy.

### Efekty

- cień zewnętrzny i wewnętrzny;
- rozmycie warstwy;
- rozmycie tła;
- rozmycie pierwszego planu.

## Ramki i sekcje

**Ramka** jest kontenerem. Przeciągnij kształt do ramki, aby zmienić jego obiekt nadrzędny. Ramka może przycinać zawartość, ale ustawienie to jest domyślnie wyłączone. Ramki obsługują także [automatyczny układ](./auto-layout).

Po wybraniu narzędzia Ramka panel Projekt pokazuje grupy gotowych rozmiarów dla telefonów, tabletów, komputerów, prezentacji, zegarków, papieru i mediów społecznościowych. Wybrany rozmiar tworzy nazwaną ramkę pośrodku widoku.

**Sekcja** jest kontenerem najwyższego poziomu. Podczas rysowania automatycznie przejmuje przecinające się obiekty znajdujące się obok.

## Skróty klawiaturowe

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Prostokąt | <kbd>R</kbd> | <kbd>R</kbd> |
| Elipsa | <kbd>O</kbd> | <kbd>O</kbd> |
| Linia | <kbd>L</kbd> | <kbd>L</kbd> |
| Ramka | <kbd>F</kbd> | <kbd>F</kbd> |
| Sekcja | <kbd>⇧</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>S</kbd> |
| Kwadrat lub koło | <kbd>Shift</kbd> + przeciąganie | <kbd>Shift</kbd> + przeciąganie |
