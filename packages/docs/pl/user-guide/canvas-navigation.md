---
title: Nawigacja po obszarze roboczym
description: Przesuwanie widoku, powiększanie, prowadnice linijek, przyciąganie i pomiary odległości w Pairdraw.
---

# Nawigacja po obszarze roboczym

Obszar roboczy nie ma granic. Przesuwaj widok i zmieniaj powiększenie, aby swobodnie poruszać się po projekcie.

## Przesuwanie widoku

Aby przesunąć widoczny obszar bez modyfikowania obiektów:

- <kbd>spacja</kbd> + przeciągnięcie — przytrzymaj spację i przeciągnij w dowolnym miejscu obszaru roboczego;
- **przeciąganie środkowym przyciskiem myszy** — wciśnij środkowy przycisk i przeciągnij;
- **dwa palce na gładziku** — przesuń dwoma palcami po gładziku;
- <kbd>Shift</kbd> + kółko myszy — przewijanie w poziomie.

## Narzędzie Dłoń

Naciśnij <kbd>H</kbd>, aby włączyć narzędzie Dłoń do ciągłego przesuwania widoku. Dopóki jest aktywne, każde przeciągnięcie na obszarze roboczym przesuwa widok bez konieczności przytrzymywania spacji.

Aby je wyłączyć, wybierz inne narzędzie, na przykład naciśnij <kbd>V</kbd>, aby przejść do narzędzia Przesuń.

## Powiększenie

Powiększenie zmienia się względem położenia wskaźnika:

- <kbd>Ctrl</kbd> + kółko myszy (albo <kbd>⌘</kbd> + kółko myszy w macOS) — przewiń w górę, aby powiększyć, w dół, aby pomniejszyć;
- **gest szczypania** — zsuń lub rozsuń palce na gładziku;
- **skróty klawiaturowe** — patrz tabela poniżej.

Przy myszy włącz **Powiększaj kółkiem myszy** w **Ustawienia → Edytor → Nawigacja**, aby powiększać samym kółkiem; <kbd>Shift</kbd> + kółko nadal przewija w poziomie. **Odwróć kierunek powiększania** zmienia kierunek, w którym kółko powiększa, a gest szczypania na gładziku zachowuje własny kierunek.

Gest szczypania jest wyłączony na panelach interfejsu (warstw i właściwości), aby nie zmieniał przypadkowo powiększenia strony w przeglądarce.

## Narzędzie Powiększenie

Przytrzymaj <kbd>Z</kbd> i kliknij, aby powiększyć w miejscu wskaźnika, lub kliknij z <kbd>Option</kbd>/<kbd>Alt</kbd>, aby pomniejszyć; przeciągnij, aby powiększyć zaznaczony obszar. Puszczenie <kbd>Z</kbd> przywraca poprzednie narzędzie. Krótkie naciśnięcie <kbd>Z</kbd> pozostawia narzędzie Powiększenie włączone; jest ono też w menu narzędzia Dłoń na pasku narzędzi.

Dopasowanie widoku, powiększenie do zaznaczenia i do 100%, poziomy z menu powiększenia oraz następna lub poprzednia ramka przechodzą płynnie do swojego widoku zamiast skakać. Skaczą, gdy animacje są wyłączone, tryb ultralekki jest włączony lub system prosi o ograniczenie ruchu.

## Skróty klawiaturowe

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Przesunięcie widoku | <kbd>spacja</kbd> + przeciągnięcie | <kbd>spacja</kbd> + przeciągnięcie |
| Narzędzie Dłoń | <kbd>H</kbd> | <kbd>H</kbd> |
| Narzędzie Powiększenie | <kbd>Z</kbd> | <kbd>Z</kbd> |
| Powiększenie | <kbd>⌘</kbd><kbd>+</kbd> | <kbd>Ctrl</kbd> + <kbd>+</kbd> |
| Pomniejszenie | <kbd>⌘</kbd><kbd>−</kbd> | <kbd>Ctrl</kbd> + <kbd>−</kbd> |
| Powiększenie / pomniejszenie | <kbd>+</kbd> / <kbd>−</kbd> | <kbd>+</kbd> / <kbd>−</kbd> |
| Powiększenie 100% | <kbd>⇧</kbd><kbd>0</kbd> lub <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Shift</kbd> + <kbd>0</kbd> lub <kbd>Ctrl</kbd> + <kbd>0</kbd> |
| Dopasowanie widoku | <kbd>⇧</kbd><kbd>1</kbd> | <kbd>Shift</kbd> + <kbd>1</kbd> |
| Powiększenie do zaznaczenia | <kbd>⇧</kbd><kbd>2</kbd> | <kbd>Shift</kbd> + <kbd>2</kbd> |
| Następna / poprzednia ramka | <kbd>N</kbd> / <kbd>⇧</kbd><kbd>N</kbd> | <kbd>N</kbd> / <kbd>Shift</kbd> + <kbd>N</kbd> |
| Następna / poprzednia strona | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> |
| Siatka pikseli | <kbd>⇧</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>'</kbd> |
| Przyciąganie do siatki pikseli | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>'</kbd> |
| Linijki | <kbd>⇧</kbd><kbd>R</kbd> | <kbd>Shift</kbd> + <kbd>R</kbd> |
| Kursory wielu użytkowników | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>\\</kbd> |

## Ramki i strony

<kbd>N</kbd> zaznacza następną ramkę najwyższego poziomu na stronie i powiększa do niej widok; <kbd>Shift</kbd> + <kbd>N</kbd> cofa się. Ramki wewnątrz sekcji są liczone, ukryte nie; kolejność biegnie od lewej do prawej, potem z góry na dół, i zawija się na końcach. Jeśli zaznaczona jest warstwa wewnątrz ramki, krok zaczyna się od tej ramki.

<kbd>Page Down</kbd> i <kbd>Page Up</kbd> otwierają następną i poprzednią stronę w kolejności panelu Strony.

## Siatka pikseli

Przy powiększeniu, w którym każdy piksel dokumentu zajmuje osiem pikseli ekranu (800% na zwykłym wyświetlaczu, 400% na wyświetlaczu Retina), obszar roboczy pokazuje linię na każdym pikselu, jak w Figmie. Włączysz ją lub wyłączysz poleceniem **Widok → Siatka pikseli**, skrótem <kbd>Shift</kbd> + <kbd>'</kbd> albo opcją **Pokaż siatkę pikseli** w **Ustawienia → Edytor**; wybór dotyczy wszystkich otwartych dokumentów i jest zachowywany między sesjami.

## Panele boczne {#side-panels}

Przełącznik panelu warstw znajduje się nad narzędziami przy lewej krawędzi obszaru roboczego, a przełącznik panelu właściwości na górnym pasku. Panel właściwości pojawia się po zaznaczeniu warstwy i znika razem z zaznaczeniem; panel otwarty przełącznikiem pozostaje otwarty, dopóki go nie zamkniesz, także między sesjami. Obszar roboczy zajmuje miejsce zamkniętego panelu, który otwiera się ponownie z poprzednią szerokością. **Widok → Panel warstw** i **Widok → Panel właściwości** działają tak samo. <kbd>⌘</kbd><kbd>\\</kbd> (<kbd>Ctrl</kbd> + <kbd>\\</kbd>) nadal ukrywa wszystkie panele naraz. Lista komentarzy i historia wersji są wyświetlane w panelu właściwości, więc narzędzie komentarza i historia wersji otwierają go na czas używania i potem znowu zamykają.

## Tryb ultralekki

Na wolnym komputerze lub przy zasilaniu z baterii włącz **Tryb ultralekki** w **Ustawienia → Edytor → Renderowanie**. Od razu wyłącza animacje interfejsu, a po przeładowaniu renderuje obszar roboczy kafelkami w rozdzielczości jednego piksela urządzenia na piksel ekranu, pomija rozmycia tła i szum oraz rysuje cienie w niższej rozdzielczości przy dużym powiększeniu. Renderowanie progresywne pozostaje włączone, dopóki działa tryb ultralekki. Eksportowane obrazy zachowują wszystkie efekty.

## Prowadnice linijek

Linijki są ukryte, dopóki nie włączysz ich poleceniem **Widok → Linijki** lub skrótem <kbd>Shift</kbd> + <kbd>R</kbd>. Następnie przeciągnij z górnej linijki, aby utworzyć prowadnicę poziomą, albo z lewej, aby utworzyć pionową. Upuść ją na stronie, aby utworzyć prowadnicę obszaru roboczego, albo na ramce, aby utworzyć prowadnicę we współrzędnych tej ramki.

- Kliknij prowadnicę, aby ją zaznaczyć; przeciągnij, aby zmienić jej położenie lub przenieść ją między stroną a ramką.
- Przytrzymaj <kbd>Option</kbd> / <kbd>Alt</kbd> podczas przeciągania istniejącej prowadnicy, aby ją zduplikować.
- Przeciągnij prowadnicę z powrotem na linijkę, aby ją usunąć, albo użyj polecenia **Usuń prowadnicę** z jej menu kontekstowego.
- Zmiany prowadnic można cofać i ponawiać, a pliki `.fig` je zachowują.

## Przyciąganie

W **Widok → Preferencje** włącz niezależnie **Przyciągaj do geometrii**, **Przyciągaj do obiektów** i **Przyciągaj do siatki pikseli**. Preferencje są zachowywane między sesjami.

Przyciąganie do geometrii i do obiektów pomaga wyrównać punkty wektorów, przesuwane warstwy i zmieniane krawędzie z pobliską geometrią, obiektami, prowadnicami i krawędziami ramek. Dla tych celów pojawiają się linie wyrównania; zaokrąglanie do siatki pikseli nie rysuje linii wyrównania dla każdego piksela.

Przy włączonym **Przyciągaj do obiektów** przesuwana warstwa przyciąga się też do równych odstępów: centruje się między dwoma sąsiadami albo staje w takiej odległości od sąsiada, jaka dzieli innych dwóch sąsiadów tego samego wiersza lub kolumny. Każdy odstęp tej wielkości pokazuje różowy wskaźnik ze swoim rozmiarem. Zmiana rozmiaru nie przyciąga się do odstępów.

Przy włączonym **Przyciągaj do siatki pikseli** przesuwane warstwy, zmieniane krawędzie i rysowane warstwy trafiają na całe piksele przy każdym powiększeniu, nawet jeśli zaczęły między pikselami. Przyciągnięcie do obiektu lub prowadnicy wygrywa z siatką. Przesunięcia strzałkami i wartości wpisane w panelu właściwości zachowują swoje ułamki.

Włącz **Przyciągaj do połówek pikseli** w **Ustawienia → Edytor**, aby przyciąganie do siatki pikseli mogło trafiać też na połówki pikseli, dzięki czemu obrys o szerokości 1 px może leżeć wyśrodkowany na krawędzi piksela. Tablica zachowuje własną siatkę 16 jednostek.

Przytrzymaj <kbd>Control</kbd> podczas przeciągania warstwy, aby tymczasowo pominąć przyciąganie do obiektów i pikseli — także na macOS, gdzie jest to Control, a nie Command.

## Pomiary odległości

Zaznacz warstwę, przytrzymaj <kbd>Option</kbd> w macOS albo <kbd>Alt</kbd> w Windows i Linuksie i najedź na inną warstwę, aby zobaczyć tymczasowe pomiary odległości. Puszczenie klawisza usuwa nakładkę; nie dodaje ona prowadnic ani nie zmienia dokumentu.

## Paleta poleceń

Naciśnij <kbd>⌘</kbd><kbd>K</kbd> w macOS albo <kbd>Ctrl</kbd> + <kbd>K</kbd> w Windows i Linuksie, aby przeszukać działania edytora i aplikacji. Wybranie wyniku uruchamia je; niedostępne działania nadal zależą od bieżącego zaznaczenia i stanu dokumentu.

Paleta służy też do przechodzenia między stronami. Zanim zaczniesz pisać, wyświetla strony odwiedzone ostatnio w tej karcie, od najnowszej, a **Przejdź do strony…** otwiera listę wszystkich stron. Stronę można też znaleźć, wpisując jej nazwę. Strony, na których pracują współpracownicy lub agenci AI, są wyświetlane z ich nazwami; panel Strony oznacza te same strony ich kolorami.

## Wskazówki

- Powiększenie zawsze celuje w położenie wskaźnika, więc przed zmianą powiększenia wskaż to, co chcesz obejrzeć z bliska.
- Narzędzie Dłoń przydaje się przy częstym przesuwaniu widoku — pozostaje aktywne do chwili wybrania innego narzędzia.
- Informacje o pracy z obiektami znajdziesz w sekcji [Zaznaczanie i modyfikowanie](./selection-and-manipulation).
