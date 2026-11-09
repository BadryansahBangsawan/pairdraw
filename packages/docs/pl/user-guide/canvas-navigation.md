---
title: Nawigacja po obszarze roboczym
description: Przesuwaj widok, zmieniaj powiększenie i korzystaj z narzędzia Rączka w Pairdraw.
---

# Nawigacja po obszarze roboczym

Obszar roboczy nie ma granic. Przesuwaj widok i zmieniaj powiększenie, aby pracować nad różnymi częściami projektu.

## Przesuwanie widoku

Aby przesunąć widoczny obszar bez modyfikowania obiektów:

- przytrzymaj <kbd>spację</kbd> i przeciągnij obszar roboczy;
- przeciągnij z wciśniętym środkowym przyciskiem myszy;
- przesuń dwa palce po gładziku.

## Narzędzie Rączka

Naciśnij <kbd>H</kbd>, aby włączyć narzędzie Rączka. Dopóki jest aktywne, każde przeciągnięcie na obszarze roboczym przesuwa widok bez konieczności przytrzymywania spacji.

Wybierz inne narzędzie, na przykład naciśnij <kbd>V</kbd>, aby przejść do narzędzia Zaznaczenie.

## Powiększenie

Powiększenie zmienia się względem położenia wskaźnika:

- <kbd>Ctrl</kbd> + kółko myszy albo <kbd>⌘</kbd> + kółko myszy w macOS;
- gest zsuwania lub rozsuwania palców na gładziku;
- skróty klawiaturowe z poniższej tabeli.

Po włączeniu **Powiększaj kółkiem myszy** w **Ustawienia → Edytor** kółko myszy powiększa bez wciskania klawisza; <kbd>Shift</kbd> + kółko nadal przewija w poziomie. **Odwróć kierunek powiększania** zmienia kierunek kółka, a gest na gładziku zachowuje swój.

Gest zmiany powiększenia jest wyłączony na panelach warstw i właściwości, aby nie zmieniał przypadkowo powiększenia całej strony w przeglądarce.

## Narzędzie Powiększenie

Przytrzymaj <kbd>Z</kbd> i kliknij, aby powiększyć w miejscu wskaźnika, lub kliknij z <kbd>Option</kbd>/<kbd>Alt</kbd>, aby pomniejszyć; przeciągnij, aby powiększyć zaznaczony obszar. Puszczenie <kbd>Z</kbd> przywraca poprzednie narzędzie. Krótkie naciśnięcie <kbd>Z</kbd> pozostawia narzędzie Powiększenie włączone; jest ono też w menu narzędzia Dłoń na pasku narzędzi.

Dopasowanie widoku, powiększenie do zaznaczenia i do 100%, poziomy z menu powiększenia oraz następna lub poprzednia ramka przechodzą płynnie do swojego widoku zamiast skakać. Skaczą, gdy animacje są wyłączone, tryb Ultralight jest włączony lub system prosi o ograniczenie ruchu.

## Linijki

Linijki są ukryte, dopóki nie włączysz ich poleceniem **Widok → Linijki** lub skrótem <kbd>Shift</kbd> + <kbd>R</kbd>.

## Przyciąganie

W **Widok → Preferencje** włącz niezależnie **Przyciągaj do geometrii**, **Przyciągaj do obiektów** i **Przyciągaj do siatki pikseli**. Preferencje są zachowywane między sesjami.

Przyciąganie do geometrii i do obiektów pomaga wyrównać punkty wektorów, przesuwane warstwy i zmieniane krawędzie z pobliską geometrią, obiektami, prowadnicami i krawędziami ramek. Dla tych celów pojawiają się linie wyrównania; zaokrąglanie do siatki pikseli nie rysuje linii wyrównania dla każdego piksela.

Przy włączonym **Przyciągaj do obiektów** przesuwana warstwa przyciąga się też do równych odstępów: centruje się między dwoma sąsiadami albo staje w takiej odległości od sąsiada, jaka dzieli innych dwóch sąsiadów tego samego wiersza lub kolumny. Każdy odstęp tej wielkości pokazuje różowy wskaźnik ze swoim rozmiarem. Zmiana rozmiaru nie przyciąga się do odstępów.

Przy włączonym **Przyciągaj do siatki pikseli** przesuwane warstwy, zmieniane krawędzie i rysowane warstwy trafiają na całe piksele przy każdym powiększeniu, nawet jeśli zaczęły między pikselami. Przyciągnięcie do obiektu lub prowadnicy wygrywa z siatką. Przesunięcia strzałkami i wartości wpisane w panelu właściwości zachowują swoje ułamki.

Włącz **Przyciągaj do połówek pikseli** w **Ustawienia → Edytor**, aby przyciąganie do siatki pikseli mogło trafiać też na połówki pikseli, dzięki czemu obrys o szerokości 1 px może leżeć wyśrodkowany na krawędzi piksela. Tablica zachowuje własną siatkę 16 jednostek.

Przytrzymaj <kbd>Control</kbd> podczas przeciągania warstwy, aby tymczasowo pominąć przyciąganie do obiektów i pikseli — także na macOS, gdzie jest to Control, a nie Command.

## Skróty klawiaturowe

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Przesunąć widok | <kbd>spacja</kbd> + przeciągnięcie | <kbd>spacja</kbd> + przeciągnięcie |
| Narzędzie Rączka | <kbd>H</kbd> | <kbd>H</kbd> |
| Powiększyć | <kbd>⌘</kbd><kbd>+</kbd> | <kbd>Ctrl</kbd> + <kbd>+</kbd> |
| Pomniejszyć | <kbd>⌘</kbd><kbd>−</kbd> | <kbd>Ctrl</kbd> + <kbd>−</kbd> |
| Powiększenie 100% | <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Ctrl</kbd> + <kbd>0</kbd> |

## Paleta poleceń

Naciśnij <kbd>⌘</kbd><kbd>K</kbd> w macOS albo <kbd>Ctrl</kbd> + <kbd>K</kbd> w Windows i Linuksie, aby przeszukać działania edytora i aplikacji. Wybranie wyniku uruchamia je; niedostępne działania nadal zależą od bieżącego zaznaczenia i stanu dokumentu.

Paleta służy też do przechodzenia między stronami. Zanim zaczniesz pisać, wyświetla strony odwiedzone ostatnio w tej karcie, od najnowszej, a **Przejdź do strony…** otwiera listę wszystkich stron. Stronę można też znaleźć, wpisując jej nazwę. Strony, na których pracują współpracownicy lub agenci AI, są wyświetlane z ich nazwami; panel Strony oznacza te same strony ich kolorami.

## Wskazówki

- Przed zmianą powiększenia umieść wskaźnik nad obszarem, który chcesz dokładniej obejrzeć.
- Narzędzie Rączka pozostaje aktywne do chwili wybrania innego narzędzia, dlatego dobrze sprawdza się przy częstym przesuwaniu widoku.
- Informacje o pracy z obiektami znajdziesz w sekcji [Zaznaczanie i modyfikowanie](./selection-and-manipulation).
