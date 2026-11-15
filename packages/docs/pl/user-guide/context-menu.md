---
title: Menu kontekstowe
description: Schowek, kolejność nakładania, grupy, komponenty i inne działania dostępne pod prawym przyciskiem myszy w Pairdraw.
---

# Menu kontekstowe

Kliknij obszar roboczy prawym przyciskiem myszy, aby otworzyć menu kontekstowe. Jeśli klikniesz obiekt, Pairdraw najpierw go zaznaczy. Kliknięcie pustego obszaru prawym przyciskiem usuwa bieżące zaznaczenie.

## Kopiuj/Wklej jako

Podmenu **Kopiuj/Wklej jako** udostępnia dodatkowe formaty schowka dla zaznaczonych obiektów:

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Kopiuj jako tekst | — | — |
| Kopiuj jako SVG | — | — |
| Kopiuj jako PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Kopiuj jako JSX | — | — |
| Kopiuj jako HTML | — | — |

- **Kopiuj jako tekst** — kopiuje widoczną treść tekstową zaznaczenia.
- **Kopiuj jako SVG** — kopiuje drzewo obiektów jako znaczniki SVG.
- **Kopiuj jako PNG** — renderuje w skali 2× i umieszcza obraz w schowku systemowym (do wklejenia w Slacku, Notion itp.).
- **Kopiuj jako JSX** — kopiuje reprezentację Pairdraw JSX do użycia z `renderJsx()`.
- **Kopiuj jako HTML** — kopiuje fragment HTML ze stylami w atrybutach i osadzonymi obrazami, gotowy do wklejenia na stronę lub do wiadomości e-mail; działa także w dokumentach tylko do odczytu.

## Uruchom karteczkę jako polecenie {#run-sticky-as-prompt}

Gdy zaznaczone są wyłącznie karteczki i co najmniej jedna zawiera tekst, **Uruchom karteczkę jako polecenie** wysyła ich tekst do [czatu AI](/pl/programmable/ai-chat) dokumentu, z odwołaniem do każdej karteczki, aby asystent wiedział, skąd pochodzi tekst. Polecenie pojawia się tylko w dokumentach, które możesz edytować. Jeśli żaden model nie jest jeszcze skonfigurowany, Pairdraw najpierw szuka agenta programistycznego na Twoim komputerze, a gdy go nie znajdzie, otwiera konfigurację z przewodnikiem; potem wysyła polecenie.

## Schowek

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Kopiuj | <kbd>⌘</kbd><kbd>C</kbd> | <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Wytnij | <kbd>⌘</kbd><kbd>X</kbd> | <kbd>Ctrl</kbd> + <kbd>X</kbd> |
| Wklej tutaj | <kbd>⌘</kbd><kbd>V</kbd> | <kbd>Ctrl</kbd> + <kbd>V</kbd> |
| Duplikuj | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| Usuń | <kbd>⌫</kbd> | <kbd>Backspace</kbd> / <kbd>Delete</kbd> |

Gdy nic nie jest zaznaczone, działania schowka są niedostępne (poza wklejaniem, dostępnym, gdy schowek ma zawartość).

## Kopiowanie i wklejanie właściwości

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Kopiuj właściwości | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Wklej właściwości | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>V</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>V</kbd> |

Oba polecenia są w podmenu **Kopiuj/Wklej jako**.

- **Kopiuj właściwości** umieszcza zaznaczoną warstwę w schowku systemowym tak jak Figma, z oznaczeniem, dzięki któremu zwykłe wklejanie ją pomija.
- **Wklej właściwości** nadaje wygląd jedynej warstwy ze schowka wszystkim zaznaczonym warstwom, także zablokowanym, w jednym kroku cofania. Odczytuje kopię wykonaną poleceniem Kopiuj właściwości albo zwykłym kopiowaniem, tutaj lub w Figmie.
- Wygląd obejmuje wypełnienia, obrysy, efekty, przezroczystość, tryb mieszania, promień narożników oraz powiązane style i zmienne. Między ramkami obejmuje też automatyczny układ i siatki układu, a między warstwami tekstowymi styl tekstu. Położenie, rozmiar, obrót, nazwa i zawartość nigdy się nie zmieniają, a właściwości, które warstwa tekstowa ma różne dla różnych znaków, pozostają nietknięte.

## Kolejność nakładania

| Działanie | Klawisz |
|-----------|---------|
| Przenieś na wierzch | <kbd>]</kbd> |
| Przenieś na spód | <kbd>[</kbd> |

Polecenia przesuwają zaznaczony obiekt na początek lub koniec listy elementów jego obiektu nadrzędnego.

## Grupy i automatyczny układ

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Grupuj | <kbd>⌘</kbd><kbd>G</kbd> | <kbd>Ctrl</kbd> + <kbd>G</kbd> |
| Rozgrupuj | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>G</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>G</kbd> |
| Dodaj auto-layout | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

- **Grupuj** wymaga zaznaczenia co najmniej dwóch obiektów.
- **Rozgrupuj** pojawia się po zaznaczeniu grupy — jej elementy trafiają do obiektu nadrzędnego grupy.
- **Dodaj auto-layout** umieszcza zaznaczenie w nowej ramce z [automatycznym układem](./auto-layout).

## Komponenty

Działania dotyczące komponentów są wyświetlane na fioletowo, w kolorze komponentów.

| Działanie | macOS | Windows / Linux | Dostępne dla |
|-----------|-------|-----------------|--------------|
| Utwórz komponent | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd> | Dowolnego zaznaczenia |
| Utwórz zestaw komponentów | — | — | Co najmniej dwóch zaznaczonych komponentów |
| Utwórz instancję | — | — | Komponentów (bez skrótu) |
| Przejdź do komponentu | — | — | Instancji |
| Odłącz instancję | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> | Instancji |

Pracę z komponentami szczegółowo opisuje strona [Komponenty](./components).

## Widoczność i blokada

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Ukryj / Pokaż | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>H</kbd> |
| Zablokuj / Odblokuj | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>L</kbd> |

Etykieta zmienia się zależnie od bieżącego stanu obiektu (np. „Ukryj” dla widocznego obiektu, „Pokaż” dla ukrytego).

## Przenieś na stronę

Podmenu **Przenieś na stronę** zawiera wszystkie strony poza bieżącą. Wybierz stronę, aby przenieść zaznaczone obiekty na jej obszar roboczy.

## Wskazówki

- Kliknięcie prawym przyciskiem pustego obszaru daje dostęp do wklejania — przydatne, gdy chcesz umieścić zawartość w konkretnym miejscu.
- Działania komponentów pojawiają się tylko wtedy, gdy mają sens (np. „Utwórz instancję” tylko dla komponentów).
- Menu kontekstowe pokazuje skróty klawiaturowe — to dobry sposób na poznanie skrótów, których jeszcze nie znasz.
