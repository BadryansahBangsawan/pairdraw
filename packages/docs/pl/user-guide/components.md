---
title: Komponenty
description: Komponenty, instancje, zestawy wariantów, nadpisania, synchronizacja na żywo i biblioteki w Pairdraw.
---

# Komponenty

Komponent jest elementem projektu przeznaczonym do ponownego użycia. Po zmianie głównego komponentu wszystkie jego instancje aktualizują się automatycznie.

## Przeglądanie komponentów

Otwórz kartę **Zasoby** w lewym panelu, aby przeglądać lokalne komponenty i włączone biblioteki. Dostępne są widok siatki i lista, wyszukiwanie według nazwy komponentu, a po zaznaczeniu komponentu — jego szczegóły. Zasób można wstawić kliknięciem, klawiszem <kbd>Enter</kbd> lub przeciągnięciem na obszar roboczy.

Zasoby lokalne są pogrupowane według strony źródłowej. Zasoby opublikowanych bibliotek pozostają dostępne, jeśli ich wersja została pobrana, także gdy zdalny dostawca jest chwilowo niedostępny.

## Tworzenie komponentu

Zaznacz ramkę lub grupę i naciśnij <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>). Zaznaczenie staje się komponentem wielokrotnego użytku.

Każda inna warstwa lub kilka warstw zostaje umieszczonych w nowym białym komponencie o granicach ich wspólnej ramki ograniczającej, w miejscu najwyższej warstwy na liście warstw; pojedyncza warstwa nadaje komponentowi swoją nazwę.

Nad komponentami wyświetla się fioletowa etykieta z ikoną rombu.

## Zestawy komponentów i warianty

Zaznacz co najmniej dwa komponenty i wybierz **Utwórz zestaw komponentów** z menu kontekstowego, aby połączyć je w zestaw komponentów — kontener z fioletową przerywaną ramką i wypełnieniem 20 px wokół elementów, jak w Figmie. Zestawy tworzone przez skrypty poleceniem `figma.combineAsVariants()` obejmują swoje komponenty dokładnie, tak jak w API wtyczek Figmy.

Każdy komponent w zestawie może określać wartości w kilku wymiarach wariantu, na przykład `Size=Small`, `State=Hover` i `Theme=Dark`. Pairdraw obsługuje niepełne kombinacje, więc zestaw nie musi zawierać wszystkich możliwych kombinacji. Wariant w lewym górnym rogu jest domyślny i służy jako zamiennik, gdy aktualizacja nie zawiera już dokładnej kombinacji.

Zaznacz komponent i kliknij **Dodaj wariant** w nagłówku panelu, aby zamienić go w zestaw komponentów, jak w Figmie: komponent staje się `Property 1=Default`, a pod nim pojawia się kopia o nazwie `Property 1=Variant2`. W zestawie **Dodaj wariant** kopiuje ostatni wariant z następną wartością. Właściwości wariantów zestawu są wierszami listy **Właściwości**; kliknij jedną z nich, aby zmienić jej nazwę albo dodawać, przemianowywać, przeciągać w nowej kolejności lub usuwać jej wartości. Usunięcie wartości, której używają warianty, najpierw przenosi je do innej wartości, a warianty o wszystkich wartościach wspólnych są wymienione w powiadomieniu, które je zaznacza.

## Właściwości komponentów

Komponenty i zestawy komponentów obsługują właściwości wielokrotnego użytku: tekstowe, logiczne (widoczność), zamiany instancji i slotów. Zaznacz instancję, aby edytować ich wartości bez odłączania. Właściwości i ich wartości są zachowywane przy zapisie i ponownym otwarciu plików `.fig`.

Aby powiązać warstwę głównego komponentu z właściwością, użyj przycisku powiązania przy jej polu: **Typografia** dla treści tekstu, **Wygląd** dla widoczności i nagłówek instancji dla zamienianego komponentu. Utwórz właściwość z bieżącej wartości warstwy albo wybierz istniejącą; pole pokazuje wtedy właściwość zamiast wartości. Wpisanie tekstu w powiązane pole ustawia właściwość — jej wartość domyślną w głównym komponencie, a wartość instancji w instancji.

Zaznacz główny komponent, aby zobaczyć jego **Właściwości**. Kliknij właściwość, aby zmienić jej nazwę lub wartość domyślną, zobaczyć i odłączyć sterowane przez nią warstwy albo ją usunąć; przeciągaj właściwości, aby zmienić ich kolejność. **+** dodaje właściwość tekstową, logiczną lub zamiany instancji.

Aby pokazać właściwości zagnieżdżonej instancji w instancjach komponentu, wybierz **+ → Zagnieżdżone instancje** i zaznacz ją, tak jak działa **Expose properties from nested instances** w Figmie. Instancje komponentu wymieniają wtedy jej właściwości pod jej nazwą. Udostępnić można tylko instancję, której komponent ma właściwości.

## Sloty

Slot to ramka głównego komponentu, której zawartość każda instancja może zmieniać. Zaznacz ramkę wewnątrz głównego komponentu i wybierz **Utwórz slot** z menu kontekstowego lub sekcji Sloty albo zaznacz inne warstwy, aby umieścić je w nowej ramce slotu. Ustawienia slotu określają opis, preferowane komponenty i liczbę elementów, którą mieści; instancja poza tymi granicami pokazuje ostrzeżenie. W instancji można dodawać, przestawiać i usuwać elementy slotu albo przywrócić zawartość komponentu.

## Zachowania i podgląd {#behaviours-and-preview}

Zachowanie sprawia, że główny komponent lub zestaw komponentów działa jak prawdziwa kontrolka, wzorowana na prymitywach [Reka UI](https://reka-ui.com): Przycisk, Pole tekstowe, Obszar tekstowy, Pole liczbowe, Przełącznik (Toggle), Przełącznik (Switch), Pole wyboru, Opcja, Grupa opcji, Grupa przełączników, Suwak, Postęp, Karty, Zwijany panel lub Akordeon. Zaznacz komponent i użyj **+** w sekcji **Zachowanie**, aby je wybrać.

Sekcja wymienia, czego kontrolka potrzebuje:

- **Wartości** — właściwość przechowująca każdą wartość: właściwość wariantu lub logiczna dla stanów Wł., Zaznaczony, Wciśnięty, Otwarty, Wypełnione lub Wyłączony (z wartościami wariantu oznaczającymi włączenie i wyłączenie), właściwość tekstowa dla tekstu pola albo własne minimum, maksimum, krok i wartość domyślna suwaka.
- **Części** — slot rysujący każdą część, np. uchwyt przełącznika, ścieżkę, zakres i uchwyt suwaka albo listę kart. Slot elementów grupy zawiera instancje jej opcji, przełączników lub zwijanych paneli.
- **Stany** — właściwość wariantu, której wartości rysują stan domyślny, najechanie, wciśnięcie, fokus i wyłączenie. Wartości nazwane jak te stany są dopasowywane automatycznie.

Wiersze wymagane przez kontrolkę są na początku; pozostałe znajdują się w **Więcej opcji**. Gdy komponent nie ma jeszcze nic do powiązania, wiersz proponuje utworzenie tego: warstwy tekstu i właściwości tekstowej, wariantów Off i On albo slotu, a **Stany** oferuje **Dodaj warianty stanów**, które dodaje warianty komponentu Default, Hover, Pressed, Focus i Disabled. Samodzielny główny komponent, który dostaje w ten sposób warianty, staje się zestawem komponentów, a slot dodany do zestawu pojawia się w każdym wariancie. Dopóki kontrolka nie działa, wiersz pod jej nazwą mówi, czego jeszcze brakuje; kliknięcie go prowadzi w to miejsce.

Naciśnij <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>), wybierz **Widok → Preview** albo użyj przycisku ▶ Preview na górnym pasku, aby obejrzeć podgląd obszaru roboczego. Każda warstwa najwyższego poziomu zawierająca kontrolki działa jako komponenty Reka UI na żywo nad obszarem roboczym, rysowane wariantami komponentu: przełączniki się przełączają, suwaki dają się przeciągać, karty i akordeony się otwierają, a pola tekstowe są prawdziwymi polami z kursorem, zaznaczaniem i wklejaniem przeglądarki. Podgląd nigdy nie zmienia dokumentu ani jego historii. **Resetuj** przywraca wszystkie kontrolki do zaprojektowanego stanu, a <kbd>Esc</kbd> lub przycisk zamknięcia na etykiecie wraca do edycji. W widoku podzielonym każdy obszar roboczy ma własny podgląd.

Zachowania są zapisywane w plikach `.fig` i publikowane razem z komponentami bibliotek.

## Biblioteki komponentów {#component-libraries}

Biblioteka komponentów publikuje komponenty wielokrotnego użytku jako niezmienną wersję. Każdy opublikowany zasób ma stałe identyfikatory biblioteki, zasobu i wersji, dlatego różne instancje mogą pozostać na różnych wersjach, dopóki ich jawnie nie zaktualizujesz.

**Pairdraw Basics** to wbudowany oryginalny zestaw: komponenty przycisku, pola, plakietki, karty i awatara, opublikowane jako `pairdraw-basics`. Jest w panelu Zasoby bez katalogu: włącz go tam, aby wstawiać jego komponenty, także offline, i zostaje po ponownym załadowaniu. `pairdraw libraries seed --root ./catalog` nadal publikuje ten sam zestaw do katalogu plików.

### Publikowanie biblioteki

1. Utwórz komponenty i zestawy komponentów, które chcesz udostępnić.
2. Otwórz **Zasoby** i wybierz **Zarządzaj bibliotekami**.
3. Wybierz **Publikuj bibliotekę**.
4. Podaj stały identyfikator biblioteki i nazwę wyświetlaną. Identyfikator biblioteki zostaje zablokowany po pierwszej publikacji.
5. Opcjonalnie przeszukaj listę zmian i wpisz opis wersji.
6. Wybierz dodane, zmienione, przemianowane lub usunięte zasoby, które mają zostać uwzględnione.
7. Potwierdź miejsce docelowe i wybierz **Publikuj bibliotekę**.

Przy kolejnych publikacjach niewybrane zmiany pozostają oczekujące. Niezmienione zasoby zachowują poprzednio opublikowane definicje, a usunięte definicje pozostają dostępne, dopóki dokumenty odwołują się do ich historycznej wersji.

### Włączanie i wstawianie zasobów biblioteki

Otwórz **Zasoby → Zarządzaj bibliotekami**, aby włączyć opublikowaną bibliotekę. Jej komponenty pojawią się w panelu Zasoby obok lokalnych. Wstaw komponent kliknięciem, klawiaturą lub przeciągnięciem na obszar roboczy.

Opublikowane definicje są tylko do odczytu w dokumentach, które z nich korzystają. Aby zmienić definicję, edytuj dokument źródłowy i opublikuj kolejną wersję. Instancje powiązane z tymi definicjami można nadal edytować przez ich właściwości komponentu i nadpisania.

### Przeglądanie i przyjmowanie aktualizacji

Otwórz **Zarządzaj bibliotekami → Aktualizacje**, aby znaleźć nowsze wersje. Wyszukiwanie nie zmienia dokumentu. Możesz porównać bieżącą i zaktualizowaną instancję obok siebie, przechodzić między instancjami, których to dotyczy, a następnie zaktualizować:

- zaznaczoną instancję;
- wszystkie instancje jednego zasobu;
- instancje na bieżącej stronie;
- instancje na wszystkich stronach.

Pairdraw zachowuje zgodne przypisania tekstu, widoczności i zamiany instancji. Jeśli dokładny wariant już nie istnieje, przegląd wskazuje zamiennik z lewego górnego rogu, zanim go zaakceptujesz. Zastosowanie aktualizacji tworzy wpis w historii cofania.

### Praca lokalna, z pamięcią i bez sieci

Biblioteki mogą korzystać z lokalnego katalogu przeglądarki albo ze skonfigurowanego dostawcy pamięci. Publikacja zdalna używa niezmiennych obiektów wersji i warunkowego wskaźnika najnowszej wersji, dzięki czemu dwie publikujące osoby nie nadpiszą się nawzajem bez ostrzeżenia.

Pobrane wersje są przechowywane lokalnie w pamięci podręcznej. Dokument może bez sieci nadal renderować i wstawiać pobrane definicje. Błędy integralności są zgłaszane, a nie ukrywane przez dane z pamięci podręcznej.

### Zapisywanie dokumentów korzystających z bibliotek

Powiązania z włączonymi bibliotekami i potrzebne definicje są zapisywane w dokumentach `.fig`. Ponowne otwarcie takiego pliku zachowuje jego powiązane instancje i identyfikatory wersji, nawet gdy zdalna biblioteka jest niedostępna.

## Tworzenie instancji

Kliknij komponent prawym przyciskiem i wybierz **Utwórz instancję** z menu kontekstowego. Instancja pojawia się 40 px na prawo od komponentu źródłowego i wygląda identycznie.

Instancje można tworzyć tylko z menu kontekstowego — na pasku narzędzi nie ma takiego przycisku.

## Odłączanie instancji

Zaznacz instancję i naciśnij <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd>), aby ją odłączyć. Instancja staje się zwykłą ramką bez powiązania z oryginalnym komponentem. Wszystkie nadpisania zostają w niej utrwalone.

## Przekształcanie w ramkę

Zaznacz główny komponent i naciśnij <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>), czyli skrót tworzenia komponentu, albo wybierz **Przekształć w ramkę** z jego menu kontekstowego, menu typu warstwy lub menu **Obiekt**, aby z powrotem zamienić go w ramkę. Jeśli komponent ma instancje, potwierdzenie podaje ich liczbę; przekształcenie odłącza każdą instancję do ramki, która zachowuje swój wygląd, także kopie zagnieżdżone w instancjach innych komponentów. Cała zmiana jest jednym krokiem cofania.

## Przejście do głównego komponentu

Kliknij instancję prawym przyciskiem i wybierz **Przejdź do komponentu**. Edytor przechodzi do głównego komponentu i go zaznacza, w razie potrzeby zmieniając stronę.

## Synchronizacja na żywo

Gdy edytujesz komponent, wszystkie jego instancje aktualizują się automatycznie, jak w Figmie: każda właściwość, której instancja nie nadpisuje, podąża za komponentem. Dotyczy to rozmiaru, wypełnień, obrysów i ich grubości, wyrównania, zakończeń, łączeń i kreskowania, efektów, przezroczystości, trybu mieszania, promieni i wygładzenia narożników, ustawień układu i siatek, przycinania, stylów współdzielonych oraz tekstu — od czcionki i rozmiaru po odstępy między literami, wysokość wiersza, wielkość liter, dekorację, wyrównanie i zakresy stylów.

Warstwa wewnątrz instancji przejmuje też z komponentu położenie, obrót, odbicia, ograniczenia i maskę. Przesuń lub obróć warstwę w komponencie, a przesunie się w każdej instancji. Gdy instancja ma inny rozmiar niż komponent, warstwa jest umieszczana według ograniczeń, więc warstwa przypięta do prawej krawędzi zachowuje odległość od niej. W automatycznym układzie miejsce wyznacza układ.

Synchronizacja uruchamia się automatycznie po aktualizacjach obiektów, przesunięciach i zmianach rozmiaru wewnątrz komponentu.

## Nadpisania

Instancje mogą nadpisywać wybrane właściwości bez zrywania powiązania. Gdy właściwość instancji jest nadpisana, synchronizacja ją pomija — pozostałe właściwości nadal aktualizują się z głównego komponentu.

### Właściwości, które można nadpisać

Warstwa wewnątrz instancji może nadpisać nazwę, tekst, zakresy stylów i czcionkę, każdą wymienioną wyżej właściwość wizualną i tekstową, rozmiar oraz to, czy jest widoczna lub zablokowana. Położenia, obrotu, odbić, ograniczeń i maski nie można nadpisać: zawsze pochodzą z komponentu. Skrypty, które ustawiają położenie, obrót, ograniczenia lub maskę, dostają błąd jak w Figmie. Zawartość slotu należy do instancji i pozostaje edytowalna.

Nadpisania w pliku `.fig` wracają jako nadpisania po jego otwarciu i są zapisywane tak, jak zapisuje je Figma.

### Nowe elementy

Po dodaniu elementu do komponentu wszystkie istniejące instancje automatycznie dostają jego kopię. Kolejność elementów w instancjach zawsze odpowiada komponentowi.

### Tryby zmiennych

Instancja lub warstwa wewnątrz niej, która ustawia tryb jednej kolekcji zmiennych, zachowuje ten tryb, a dla pozostałych kolekcji nadal przejmuje tryby komponentu. Zmień tryb gęstości głównego komponentu, a instancja, która przełączyła tylko motyw, przyjmie nową gęstość.

### Zamiana instancji

Zaznacz instancję, także zagnieżdżoną, i kliknij przycisk zamiany w jej nagłówku, aby pokazać w jej miejscu inny komponent. Lista zawiera wszystkie komponenty dokumentu; komponent, który zawierałby sam siebie, jest niedostępny. Zamieniona zagnieżdżona instancja pozostaje zamieniona, gdy zmienia się komponent nadrzędny. Gdy zamiana jest powiązana z właściwością zamiany instancji, nagłówek pokazuje tę właściwość.

### Zastępowanie warstwy wewnątrz instancji

Skopiuj warstwę, zaznacz warstwę wewnątrz instancji i naciśnij <kbd>⌥</kbd><kbd>⇧</kbd><kbd>R</kbd> (<kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>) albo wybierz **Zastąp wewnątrz instancji** z menu Edycja lub menu kontekstowego. Skopiowana warstwa zajmuje miejsce i położenie zaznaczonej jako nadpisanie instancji, bez jej odłączania: reszta instancji nadal podąża za komponentem, a zamiennik zostaje po zmianach komponentu, dopóki komponent nie usunie zastąpionej warstwy. Przy kilku zaznaczonych warstwach każda dostaje własną kopię. Gdy nic wewnątrz instancji nie jest zaznaczone, skrót wkleja z zastąpieniem.

Zaznacz zamiennik i kliknij **Przywróć warstwę komponentu** w jego nagłówku, aby przywrócić warstwę komponentu. Zamienniki są zapisywane w plikach `.fig` jako dane wtyczki Pairdraw w instancji; Figma pokazuje zamiast nich warstwę komponentu.

## Trafianie kliknięciem

Komponenty i instancje są nieprzezroczystymi kontenerami — kliknięcie elementu wewnątrz zaznacza sam komponent, a nie ten element. **Kliknij dwukrotnie**, aby wejść do komponentu i zaznaczać elementy wewnątrz.

## Wygląd

| Element | Wygląd |
|---------|--------|
| Etykieta komponentu | Fioletowa z ikoną rombu, zawsze widoczna |
| Etykieta instancji | Fioletowa z ikoną rombu, zawsze widoczna |
| Ramka zestawu komponentów | Fioletowy przerywany obrys |

## Skróty klawiaturowe

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Utworzenie komponentu | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd> |
| Odłączenie instancji | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> |
| Podgląd | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd> |

## Wskazówki

- Zmiana tekstu wewnątrz instancji tworzy nadpisanie — tekst nie zostanie zastąpiony po zmianie komponentu.
- Zestawy komponentów porządkują warianty o kilku wymiarach, takich jak rozmiar, stan i motyw.
- Publikuj zasoby wielokrotnego użytku z dokumentu źródłowego; opublikowane definicje są celowo tylko do odczytu w dokumentach, które z nich korzystają.
- Przejrzyj aktualizacje przed ich przyjęciem, gdy wersja usuwa dokładną kombinację wariantów.
- Wszystkie działania związane z komponentami opisuje strona [Menu kontekstowe](./context-menu).
