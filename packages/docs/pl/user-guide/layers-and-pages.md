---
title: Warstwy i strony
description: Praca z warstwami, stronami i panelem właściwości w Pairdraw.
---

# Warstwy i strony

Edytor otwiera się z samym obszarem roboczym. Narzędzia znajdują się po lewej stronie obszaru roboczego, nad nimi przełącznik panelu warstw, a powiększenie w prawym dolnym rogu. Panel warstw otwiera się po lewej, panel właściwości po prawej, a czat AI w kolumnie obok; szerokość każdego z nich można zmieniać, przeciągając jego krawędź.

Gdy czat AI jest zamknięty, pole polecenia u dołu obszaru roboczego wysyła to, co napiszesz, do czatu; wyłącza je opcja **Polecenie na obszarze roboczym** w **Ustawienia → Modele → Czat**. <kbd>Escape</kbd> w polu polecenia wraca do obszaru roboczego.

## Warstwy

Lewy panel przedstawia hierarchię dokumentu jako drzewo.

- Kliknij strzałkę obok ramki, grupy lub komponentu, aby pokazać albo ukryć elementy potomne.
- Przeciągaj warstwy, aby zmienić kolejność albo obiekt nadrzędny.
- Kliknij ikonę oka, aby ukryć lub pokazać warstwę.
- Kliknij nazwę dwukrotnie, aby ją zmienić.

Wybranie warstwy na liście zaznacza odpowiadający jej obiekt na obszarze roboczym i odwrotnie.

## Strony

- Kliknij stronę, aby do niej przejść. Pairdraw przywróci zapisane położenie i powiększenie.
- Użyj przycisku dodawania, aby utworzyć stronę.
- Usuń bieżącą stronę za pomocą odpowiedniego działania.
- Kliknij nazwę dwukrotnie, aby ją zmienić.

Każda strona ma własny kolor tła, położenie widoku i powiększenie.

## Panel slajdów

Panel slajdów wyświetla ramki najwyższego poziomu strony jako numerowane miniatury slajdów, w kolejności warstw. Kliknij slajd, aby pokazać jego ramkę na obszarze roboczym, i przeciągnij slajd — albo naciśnij <kbd>Alt</kbd> ze strzałką w górę lub w dół — aby zmienić jego kolejność. **Eksportuj slajdy do PDF** zapisuje wszystkie slajdy, w tej kolejności, do jednego pliku PDF.

## Prezentacja

Prezentacja pokazuje slajdy strony na pełnym ekranie, zawsze jeden naraz. Uruchom ją przez <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd>, **Widok → Prezentuj** lub przycisk Prezentuj na górnym pasku. Strzałki, <kbd>Spacja</kbd>, <kbd>Enter</kbd>, <kbd>Page Up</kbd>/<kbd>Page Down</kbd> i kółko myszy przewijają slajdy; <kbd>Escape</kbd> kończy prezentację i przywraca obszar roboczy oraz fokus klawiatury tam, gdzie były. Slajd wyższy niż ekran jest pokazywany w 100% i można go przewijać.

## Dokumenty i odzyskiwanie

Start zaczyna się od pola polecenia: wybierz nad nim, co utworzyć (strona docelowa, aplikacja mobilna, aplikacja internetowa, slajdy, panel albo coś innego), opisz to, a Pairdraw otworzy nowy projekt i wyśle polecenie do jego czatu AI razem z przewodnikiem dla tego rodzaju; przykładowe polecenia pod polem wypełniają je pomysłem do edycji. Pod polem możesz zacząć od pliku Figma, strony we wbudowanej przeglądarce (aplikacja na komputer) albo zrzutu ekranu, który agent odtworzy. Karty przełączają między **Ostatnie**, **Szkice** i **Systemy projektowe**, a menu obok wyświetla miejsca dodane przez Twój serwer chmury i zasobnik pamięci. Pole wyszukiwania filtruje listę, **Otwórz…** otwiera plik, a **Projekt** zaczyna pusty projekt.

**Ostatnie** wyświetla ostatnie dokumenty lokalne. Korzystaj z widoku siatki lub listy i sortuj ostatnie pliki według **Nazwa**, **Ostatnio używane** lub **Utworzono**. <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-klik dodaje plik do zaznaczenia, <kbd>Shift</kbd>-klik zaznacza zakres, a <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>A</kbd> zaznacza wszystkie wylistowane pliki; pasek zaznaczenia otwiera je następnie w osobnych kartach edytora, usuwa z Ostatnio używanych lub usuwa zapisane dokumenty. Menu <kbd>⋯</kbd> pliku albo jego menu kontekstowe oferuje **Usuń z Ostatnio używanych**, które zapomina plik bez jego usuwania, oraz **Zapisz jako…**, które zapisuje kopię gdzie indziej. **Systemy projektowe** wyświetla wbudowaną bibliotekę Pairdraw Basics i biblioteki komponentów, które opublikowałeś; wybranie jednej z nich otwiera nowy projekt z tą biblioteką aktywną w panelu zasobów.

Nowy projekt pozostaje zachowany jako szkic na tym urządzeniu podczas pracy nad nim: każda zmiana jest zapisywana krótko po jej wykonaniu, więc zamknięcie jego karty o nic nie pyta. **Szkice** na Starcie wyświetla je z podglądem; otwórz jeden, aby kontynuować, albo wybierz **Usuń szkic** z jego menu <kbd>⋯</kbd> lub menu kontekstowego, aby usunąć go na stałe. Zapisanie szkicu do pliku lub repozytorium, w edytorze albo przez **Zapisz jako…** na Starcie, usuwa go ze Szkiców. Szkice żyją tylko w tym profilu przeglądarki lub tej instalacji desktopowej i wymagają, aby **Automatycznie zachowuj niezapisaną pracę** było włączone, a przeglądarka zachowywała dane witryny.

W **Ustawienia → Ogólne → Odzyskiwanie**, **Automatycznie zachowuj niezapisaną pracę** steruje szkicami oraz lokalnymi kopiami odzyskiwania. Gdy odzyskiwanie jest włączone, niezapisane dokumenty bez ścieżki pliku pozostają możliwe do odzyskania nawet po zamknięciu ich kart. Gdy Pairdraw oferuje **Odzyskaj niezapisaną pracę**, wybierz **Przywróć**, aby ponownie otworzyć dokument, lub **Odrzuć**, aby usunąć jego kopię odzyskiwania.

Otwarty plik zachowuje również kopię zapasową zmian, które nie zostały jeszcze zapisane do niego — zapisywaną, gdy autosave jest wyłączony, albo gdy okno zamyka się, zanim autosave je zapisze. Następnym razem, gdy ten plik zostanie otwarty, **Odzyskane zmiany** oferuje **Zapisz**, aby zapisać je do pliku, **Zapisz jako…**, aby otworzyć je osobno i zapisać jako nowy plik, albo **Nie zapisuj**, aby pozostawić plik nietkniętym i odrzucić kopię. Zamknięcie okna dialogowego zachowuje kopię na następny raz. Zapisanie pliku usuwa jego starsze kopie, a w przeglądarce kopia starsza niż ostatnia zmiana pliku nie jest oferowana. Kopia, której plik nie był otwarty przez tydzień, na przykład dlatego, że plik został przeniesiony, pojawia się również w **Odzyskaj niezapisaną pracę**.

Wyłączenie odzyskiwania zatrzymuje automatyczne zapisywanie i usuwa kopie odzyskiwania aktualnie otwartych dokumentów. Nie usuwa zbiorczo migawek wcześniej zamkniętych dokumentów. Odzyskiwanie jest lokalne dla tej instalacji lub tego profilu przeglądarki; nie zastępuje zapisywania pliku, synchronizacji w chmurze ani kopii zapasowej.

## Właściwości

### Projekt

Karta pokazuje właściwości zaznaczonych obiektów:

- **Wygląd:** przezroczystość, wspólny albo niezależny promień narożników i widoczność;
- **Zalew:** kolor jednolity, gradienty liniowy, radialny, kątowy i diamentowy, obraz oraz powiązanie ze zmienną;
- **Obwiednia:** kolor, grubość, zakończenia, połączenia i kreskowanie;
- **Efekty:** cień zewnętrzny i wewnętrzny oraz rozmycie warstwy, tła i pierwszego planu;
- **Typografia:** rodzina, rozmiar i odmiana czcionki oraz przyciski B/I/U/S;
- **Układ:** ustawienia [automatycznego układu](./auto-layout);
- **Eksport:** skala, format i przycisk eksportu.

Jeśli nic nie jest zaznaczone, karta pokazuje właściwości strony.

### Kod

Zaznaczony obiekt jest prezentowany jako JSX z wyróżnianiem składni. Dostępny jest także HTML z klasami Tailwind CSS v4.

### Czat AI

Czat AI tworzy i zmienia obiekty na podstawie poleceń w zwykłym języku. Otwiera się we własnej kolumnie po prawej stronie panelu właściwości, więc karta Projekt pozostaje widoczna. Kolumnę otwiera i zamyka przycisk z iskrami wśród działań dokumentu na górnym pasku albo skrót <kbd>⌘</kbd><kbd>J</kbd> lub <kbd>Ctrl</kbd><kbd>J</kbd>; jej szerokość można zmienić, przeciągając krawędź, i zostaje zapamiętana po przeładowaniu.

## Małe ekrany

Na telefonach i małych ekranach panele boczne zastępuje wysuwany panel dolny z kartami „Warstwy”, „Właściwości”, „Projekt” i „Kod”. Panel narzędzi staje się zwartym poziomym paskiem.

## Wskazówki

- Szerokość paneli jest zapisywana po ponownym załadowaniu.
- Drzewo warstw pomaga wybrać zasłonięty obiekt.
- Dodatkowe operacje znajdują się w [menu kontekstowym](./context-menu).
