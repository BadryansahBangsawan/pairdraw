---
title: Warstwy i strony
description: Praca z warstwami, stronami i panelem właściwości w Pairdraw.
---

# Warstwy i strony

Edytor otwiera się z samym obszarem roboczym. Narzędzia znajdują się po lewej stronie obszaru roboczego, nad nimi przełącznik panelu warstw, a powiększenie w prawym dolnym rogu. Panel warstw otwiera się po lewej, panel właściwości po prawej, a czat AI w kolumnie obok; szerokość każdego z nich można zmieniać, przeciągając jego krawędź. Kiedy który panel jest widoczny, opisuje sekcja [Panele boczne](./canvas-navigation#side-panels).

Gdy czat AI jest zamknięty, pole polecenia u dołu obszaru roboczego wysyła to, co napiszesz, do czatu; wyłącza je opcja **Polecenie na obszarze roboczym** w **Ustawienia → Modele → Czat**. <kbd>Escape</kbd> w polu polecenia wraca do obszaru roboczego.

## Panel warstw

Panel warstw po lewej przedstawia hierarchię dokumentu jako drzewo.

### Drzewo

Obiekty są wyświetlane w zwijanym drzewie. Kliknij strzałkę obok ramki, grupy lub komponentu, aby rozwinąć lub zwinąć elementy podrzędne.

### Zmiana kolejności przeciąganiem

Przeciągaj warstwy, aby zmienić ich kolejność. Obiekty wyżej na liście są rysowane na wierzchu.

### Widoczność

Kliknij ikonę oka obok warstwy, aby ukryć ją lub pokazać na obszarze roboczym. Ukryte obiekty pozostają w drzewie.

### Zmiana nazwy

Kliknij nazwę warstwy dwukrotnie, aby zmienić ją w miejscu. <kbd>Enter</kbd> lub kliknięcie poza polem zatwierdza zmianę, a <kbd>Escape</kbd> ją anuluje.

### Synchronizacja zaznaczenia

Kliknięcie warstwy w panelu zaznacza odpowiadający jej obiekt na obszarze roboczym i odwrotnie.

### Znajdź warstwy {#find-layers}

Naciśnij <kbd>⌘</kbd><kbd>F</kbd> (<kbd>Ctrl</kbd> + <kbd>F</kbd>), wybierz **Edycja → Znajdź warstwy…** albo uruchom to polecenie z palety poleceń, aby wyszukać warstwy wyświetlanej strony po nazwie. Wybranie wyniku zaznacza tę warstwę i przewija do niej widok.

## Panel stron

Panel stron pokazuje wszystkie strony dokumentu.

- **Przełączanie strony** — kliknij stronę, aby ją aktywować. Obszar roboczy przechodzi do tej strony i przywraca jej położenie widoku.
- **Dodawanie strony** — kliknij przycisk dodawania, aby utworzyć nową stronę.
- **Usuwanie strony** — usuwa bieżącą stronę.
- **Zmiana nazwy strony** — kliknij nazwę strony dwukrotnie, aby ją edytować w miejscu. <kbd>Enter</kbd>, <kbd>Escape</kbd> lub kliknięcie poza polem zatwierdza nową nazwę.

Każda strona ma własny obszar roboczy i stan widoku.

## Panel slajdów

Panel slajdów wyświetla ramki najwyższego poziomu strony jako numerowane miniatury slajdów, w kolejności warstw. Kliknij slajd, aby pokazać jego ramkę na obszarze roboczym, i przeciągnij slajd — albo naciśnij <kbd>Alt</kbd> ze strzałką w górę lub w dół — aby zmienić jego kolejność. **Eksportuj slajdy do PDF** zapisuje wszystkie slajdy, w tej kolejności, do jednego pliku PDF.

## Prezentacja

Prezentacja pokazuje slajdy strony na pełnym ekranie, zawsze jeden naraz. Uruchom ją przez <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd>, **Widok → Prezentuj** lub przycisk Prezentuj na górnym pasku. Strzałki, <kbd>Spacja</kbd>, <kbd>Enter</kbd>, <kbd>Page Up</kbd>/<kbd>Page Down</kbd> i kółko myszy przewijają slajdy; <kbd>Escape</kbd> kończy prezentację i przywraca obszar roboczy oraz fokus klawiatury tam, gdzie były. Slajd wyższy niż ekran jest pokazywany w 100% i można go przewijać.

## Dokumenty i odzyskiwanie

Start zaczyna się od pola polecenia: wybierz nad nim, co utworzyć (strona docelowa, aplikacja mobilna, aplikacja internetowa, slajdy, panel albo coś innego), opisz to, a Pairdraw otworzy nowy projekt i wyśle polecenie do jego czatu AI razem z przewodnikiem dla tego rodzaju; przykładowe polecenia pod polem wypełniają je pomysłem do edycji. Pod polem możesz zacząć od pliku Figma, strony we wbudowanej przeglądarce (aplikacja na komputer) albo zrzutu ekranu, który agent odtworzy. Karty przełączają między **Ostatnie**, **Szkice** i **Systemy projektowe**, a menu obok wyświetla miejsca dodane przez Twój serwer chmury i zasobnik pamięci. Pole wyszukiwania filtruje listę, **Otwórz…** otwiera plik, a **Projekt** zaczyna pusty projekt.

**Ostatnie** wyświetla ostatnie dokumenty lokalne. Korzystaj z widoku siatki lub listy i sortuj ostatnie pliki według **Nazwa**, **Ostatnie użycie** lub **Data utworzenia**. <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-klik dodaje plik do zaznaczenia, <kbd>Shift</kbd>-klik zaznacza zakres, a <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>A</kbd> zaznacza wszystkie wylistowane pliki; pasek zaznaczenia otwiera je następnie w osobnych kartach edytora, usuwa z ostatnich lub usuwa zapisane dokumenty. Menu <kbd>⋯</kbd> pliku albo jego menu kontekstowe oferuje **Usuń z ostatnich**, które zapomina plik bez jego usuwania, oraz **Zapisz jako…**, które zapisuje kopię gdzie indziej. **Systemy projektowe** wyświetla, tak jak Dodatki, wbudowaną bibliotekę Pairdraw Basics i biblioteki komponentów, które opublikowałeś; wybranie jednej z nich otwiera nowy projekt z tą biblioteką włączoną w panelu Zasoby.

Nowy projekt pozostaje zachowany jako szkic na tym urządzeniu podczas pracy nad nim: każda zmiana jest zapisywana krótko po jej wykonaniu, więc zamknięcie jego karty o nic nie pyta. **Szkice** na Starcie wyświetla je z podglądem; otwórz jeden, aby kontynuować, albo wybierz **Usuń szkic** z jego menu <kbd>⋯</kbd> lub menu kontekstowego, aby usunąć go na stałe. Zapisanie szkicu do pliku lub pamięci, w edytorze albo przez **Zapisz jako…** na Starcie, usuwa go ze Szkiców. Szkice żyją tylko w tym profilu przeglądarki lub tej instalacji desktopowej i wymagają, aby **Automatycznie zachowuj niezapisaną pracę** było włączone, a przeglądarka zachowywała dane witryny.

W **Ustawienia → Ogólne → Odzyskiwanie**, **Automatycznie zachowuj niezapisaną pracę** steruje szkicami oraz lokalnymi kopiami odzyskiwania. Gdy odzyskiwanie jest włączone, niezapisane dokumenty bez ścieżki pliku pozostają możliwe do odzyskania nawet po zamknięciu ich kart. Gdy Pairdraw oferuje **Odzyskaj niezapisaną pracę**, wybierz **Przywróć**, aby ponownie otworzyć dokument, lub **Odrzuć**, aby usunąć jego kopię odzyskiwania.

Otwarty plik zachowuje również kopię zapasową zmian, które nie zostały jeszcze zapisane do niego — zapisywaną, gdy autosave jest wyłączony, albo gdy okno zamyka się, zanim autosave je zapisze. Następnym razem, gdy ten plik zostanie otwarty, **Odzyskane zmiany** oferuje **Zapisz**, aby zapisać je do pliku, **Zapisz jako…**, aby otworzyć je osobno i zapisać jako nowy plik, albo **Nie zapisuj**, aby pozostawić plik nietkniętym i odrzucić kopię. Zamknięcie okna dialogowego zachowuje kopię na następny raz. Zapisanie pliku usuwa jego starsze kopie, a w przeglądarce kopia starsza niż ostatnia zmiana pliku nie jest oferowana. Kopia, której plik nie był otwarty przez tydzień, na przykład dlatego, że plik został przeniesiony, pojawia się również w **Odzyskaj niezapisaną pracę**.

Wyłączenie odzyskiwania zatrzymuje automatyczne zapisywanie i usuwa kopie odzyskiwania aktualnie otwartych dokumentów. Nie usuwa zbiorczo migawek wcześniej zamkniętych dokumentów. Odzyskiwanie jest lokalne dla tej instalacji lub tego profilu przeglądarki; nie zastępuje zapisywania pliku, synchronizacji w chmurze ani kopii zapasowej.

## Dodatki {#goodies}

Przycisk z prezentem na górnym pasku, **Obiekt → Dodatki…** albo paleta poleceń otwiera Dodatki — zbiór materiałów na dobry początek: style do przypięcia do czatu AI, systemy projektowe, które możesz włączyć, skrypty, które trafiają na obszar roboczy jako [warstwy skryptów](/user-guide/script-layers), oraz shadery z galerii, które wypełniają zaznaczone warstwy albo nowy prostokąt.

## Panel właściwości

Panel właściwości po prawej przełącza się między kartami „Design” i „Kod”, a obok nich jest karta [„Sprawdź”](/user-guide/checking-designs) w postaci ikony. Czat AI otwiera się we własnej kolumnie obok.

### Karta Design

Pokazuje właściwości zaznaczonych obiektów w sekcjach:

- **Wygląd:** przezroczystość, promień narożników (z przełącznikiem niezależnych narożników) i widoczność;
- **Wypełnienie:** kolor jednolity, gradienty (liniowy, radialny, kątowy, diamentowy), wypełnienia obrazem i powiązania ze zmiennymi;
- **Obrys:** kolor, grubość, zakończenia, łączenia i wzór kreskowania;
- **Efekty:** cień zewnętrzny i wewnętrzny oraz rozmycie warstwy, tła i pierwszego planu;
- **Typografia:** rodzina, rozmiar i odmiana czcionki oraz przyciski formatowania B/I/U/S (widoczne dla obiektów tekstowych);
- **Układ:** ustawienia [automatycznego układu](./auto-layout) (widoczne dla ramek z automatycznym układem);
- **Eksport:** skala, format i przycisk eksportu (patrz [Eksport](./exporting)).

Jeśli nic nie jest zaznaczone, karta Design pokazuje właściwości strony, w tym kolor tła obszaru roboczego.

### Karta Kod

Pokazuje zaznaczenie jako kod z wyróżnianiem składni, numerami wierszy i przyciskiem kopiowania. Wybierz wynik:

- **Design JSX** — drzewo komponentów Pairdraw, które `renderJSX()` odczytuje z powrotem; edytuj je na żywo, a warstwy podążają za zmianami;
- **HTML** — znaczniki ze zwykłym CSS lub klasami Tailwind;
- **Vue** i **React** — komponenty dla zaznaczenia, stylowane CSS lub Tailwind.

Gdy karta Kod jest otwarta, podkreśla też błędy i ostrzeżenia sprawdzania projektu w kodzie ich warstw ([Checking Designs](/user-guide/checking-designs#in-the-code-panel)).

## Kolumna czatu AI

[Czat AI](/pl/programmable/ai-chat) tworzy i zmienia obiekty na podstawie poleceń w zwykłym języku. Otwiera się we własnej kolumnie po prawej stronie panelu właściwości, więc karta Design pozostaje widoczna, gdy agent pracuje. Kolumnę otwiera i zamyka przycisk z iskrami wśród działań dokumentu na górnym pasku albo skrót <kbd>⌘</kbd><kbd>J</kbd>; jej szerokość można zmienić, przeciągając krawędź. Kolumna pozostaje otwarta lub zamknięta, z ustawioną szerokością, także po przeładowaniu. Modele wielokrotnego użytku i połączenia z dostawcami konfiguruje się w Ustawieniach, a zapisane lokalnie rozmowy można przeglądać w menu historii czatu.

## Skróty klawiaturowe

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Otwarcie lub zamknięcie kolumny czatu AI | <kbd>⌘</kbd><kbd>J</kbd> | <kbd>Ctrl</kbd> + <kbd>J</kbd> |
| Znajdź warstwy | <kbd>⌘</kbd><kbd>F</kbd> | <kbd>Ctrl</kbd> + <kbd>F</kbd> |

## Małe ekrany

Na telefonach i małych ekranach panele boczne zastępuje wysuwany panel dolny. Karty u jego góry przełączają między widokami „Warstwy”, „Właściwości”, „Design”, „Kod” i „AI”. Pasek narzędzi staje się zwartym poziomym paskiem z przełączaniem kategorii.

## Wskazówki

- Szerokości paneli, w tym kolumny czatu AI, są zapisywane automatycznie i zachowywane po przeładowaniu.
- Panel warstw pomaga znaleźć nakładające się obiekty, które trudno kliknąć na obszarze roboczym.
- Dodatkowe operacje na zaznaczonych obiektach znajdują się w [menu kontekstowym](./context-menu).
- Skróty kolejności (<kbd>]</kbd>/<kbd>[</kbd>) oraz przełączniki widoczności i blokady opisuje strona [Zaznaczanie i modyfikowanie](./selection-and-manipulation).
