---
title: Kształty
description: Tworzenie prostokątów, elips, linii, ramek, sekcji, wielokątów i gwiazd w Pairdraw.
---

# Kształty

Pasek narzędzi po lewej stronie obszaru roboczego zawiera narzędzia do tworzenia kształtów, ramek i sekcji. Wybierz narzędzie, a następnie kliknij i przeciągnij wskaźnik po obszarze roboczym.

## Narzędzia

| Narzędzie | Klawisz | Wynik |
|-----------|---------|-------|
| Prostokąt | <kbd>R</kbd> | Rysuje prostokąt |
| Elipsa | <kbd>O</kbd> | Rysuje elipsę |
| Linia | <kbd>L</kbd> | Rysuje linię |
| Ramka | <kbd>F</kbd> lub <kbd>A</kbd> | Rysuje ramkę (kontener na inne obiekty) |
| Sekcja | <kbd>Shift</kbd> + <kbd>S</kbd> | Rysuje sekcję (przejmuje sąsiednie obiekty, które w całości obejmuje) |

## Umieszczanie obrazów

Wybierz **Plik › Umieść obraz…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd> lub <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>K</kbd> w systemach Windows i Linux) albo kliknij przycisk obrazu na pasku narzędzi i wskaż pliki PNG, JPEG, WebP, GIF, AVIF lub SVG. Pojawią się zaznaczone na środku widoku jako jeden krok, który można cofnąć; plik SVG staje się edytowalnymi warstwami.

Narzędzie **Karteczka** jest na pasku narzędzi zaraz po narzędziu Tekst. Nie ma klawisza, więc <kbd>N</kbd> nadal przybliża do następnej ramki.

## Dodatkowe kształty

Rozwijane menu kształtów (dostępne z paska narzędzi) zawiera dodatkowe kształty:

- **Wielokąt:** domyślnie wielokąt o trzech bokach (trójkąt);
- **Gwiazda:** pięć ramion i promień wewnętrzny 0,38.

Wielokąt i Gwiazda nie mają skrótów klawiaturowych — wybiera się je z rozwijanego menu kształtów na pasku narzędzi.

## Dostosowywanie paska narzędzi

Kliknij pasek narzędzi prawym przyciskiem i wybierz **Dostosuj pasek narzędzi…** albo otwórz **Ustawienia → Edytor**, aby go zmienić:

- Wyłącz przełącznik narzędzia, aby je ukryć. Ukryte narzędzia zachowują skróty klawiaturowe. Narzędzie **Przesuń** jest zawsze widoczne.
- Przeciągnij narzędzie, aby zmienić jego kolejność. Upuszczone wewnątrz pola dołącza do tego menu; upuszczone w odstępie między polami staje się osobnym przyciskiem; upuszczone na inne narzędzie tworzy z nim wspólne menu.
- Menu **⋯** narzędzia przesuwa je w górę lub w dół, grupuje z narzędziem powyżej albo wyjmuje je z menu. Uchwyt narzędzia przesuwa je też klawiszami <kbd>↑</kbd> i <kbd>↓</kbd>.
- **Wstaw ikonę** uruchamia polecenie zamiast wybierać narzędzie, więc można je przesuwać i ukrywać, ale nie może dołączyć do menu.

**Przywróć domyślne** przywraca pierwotny układ. Narzędzia dodane w późniejszych wersjach dołączają do swojego domyślnego menu, więc dostosowany pasek narzędzi też je dostaje.

## Rysowanie z ograniczeniami

Przytrzymaj <kbd>Shift</kbd> podczas przeciągania, aby ograniczyć kształt:

- prostokąt → kwadrat (równa szerokość i wysokość);
- elipsa → koło;
- linia → przyciąganie do kątów 0°, 45° i 90°.

## Właściwości kształtu

Po narysowaniu kształtu zaznacz go, aby edytować jego właściwości na karcie Design panelu właściwości.

### Wypełnienie

Każdy kształt może mieć wypełnienie. Sekcja Wypełnienie obsługuje:

- **Kolor jednolity** — wybierany w próbniku HSV albo wpisywany jako wartość szesnastkowa.
- **Gradient** — liniowy, radialny, kątowy lub diamentowy, z edytowalnymi punktami gradientu. Gdy próbnik gradientu jest otwarty, obszar roboczy pokazuje jego uchwyty: przeciągnij koniec lub punkt promienia, aby go przesunąć, przytrzymaj <kbd>Shift</kbd>, aby obracać co 15°, i przeciągnij kwadrat punktu gradientu, aby przesunąć go wzdłuż linii.
- **Siatka** — siatka kolorowych punktów, które przenikają się na warstwie. Karta Siatka pokazuje każdy punkt: zaznacz go, aby zmienić jego kolor, albo zmień **Kolumny** i **Wiersze**, aby próbkować siatkę od nowa (do 4 w każdym kierunku). Siatka działa w wypełnieniach i obrysach; pliki `.fig` zachowują siatkę i gdzie indziej pokazują jej własny kolor, a farby `mesh_gradient` z plików `.pen` są importowane.
- **Obraz** — wybierz plik obrazu jako wypełnienie albo wklej adres w polu **Adres URL obrazu** i wybierz **Wczytaj**, aby pobrać z sieci obraz PNG, JPEG, GIF lub WebP (albo adres `data:`) o rozmiarze do 64 MB.
- **Shader** — animowany shader GLSL: zacznij od galerii w wyborze wypełnienia shaderem, dodaj do niego efekty albo wklej preset skopiowany z shaders.com.

Wypełnienie obrazem ma jeden z pięciu trybów: **Wypełnij** pokrywa warstwę i przycina obraz, **Dopasuj** pokazuje cały obraz wewnątrz warstwy, **Rozciągnij** rozciąga cały obraz do proporcji warstwy, **Przytnij** pozwala wybrać widoczną część obrazu, a **Kafelki** powtarza obraz. Rozciągnięcie jest zapisywane jako przycięcie całego obrazu, tak jak zapisują je pliki `.pen` i odczytuje Figma.

Aby przyciąć lub przekadrować obraz na obszarze roboczym, kliknij dwukrotnie warstwę, naciśnij <kbd>Enter</kbd>, gdy jest zaznaczona, albo wybierz **Przytnij obraz** z menu kontekstowego lub z wypełnienia obrazem. Obraz pojawia się w całości, przygaszony poza warstwą. Przeciągnij narożniki lub paski krawędzi warstwy, aby przyciąć ją nad nieruchomym obrazem, przeciągnij obraz, aby przesunąć go pod warstwą, i przeciągnij jego narożne punkty, aby go przeskalować. <kbd>Shift</kbd> zachowuje proporcje lub jedną oś, a <kbd>Alt</kbd> działa od środka. Każde przeciągnięcie to jeden krok do cofnięcia i zapisuje wypełnienie jako przycięcie; <kbd>Enter</kbd>, <kbd>Esc</kbd>, dwuklik lub kliknięcie poza obrazem kończy. Wektory, warstwy z elementami podrzędnymi i warstwy rozmieszczane przez automatyczny układ zachowują swoje krawędzie; w nich możesz tylko przesuwać i skalować obraz.

### Tryb shadera

Tryb shadera pokazuje wypełnienie shaderem osobno i w dużej skali, z odtwarzaniem i pauzą, suwakiem fazy oraz ustawieniami shadera obok. Otwórz go poleceniem **Otwórz w trybie shadera** w wyborze wypełnienia shaderem albo przez **Widok → Tryb shadera**, gdy zaznaczenie ma wypełnienie shaderem.

### Obrys

Każdy kształt może mieć obrys. Jego właściwości:

- **Grubość** — wspólna albo osobna dla każdego boku (góra, prawa, dół, lewa), wybierana z rozwijanej listy boków.
- **Kolor** — kolor jednolity z przezroczystością.
- **Wyrównanie** — wewnątrz, pośrodku lub na zewnątrz krawędzi kształtu (renderowanie z przycinaniem odpowiada zachowaniu Figmy).
- **Zakończenia** — Brak, okrągłe, kwadratowe, strzałka liniowa, strzałka trójkątna (dla ścieżek otwartych).
- **Łączenia** — ostre, ścięte, okrągłe.
- **Kreskowanie** — długość kreski i przerwy.

### Promień narożników

Dostępny dla prostokątów, ramek, komponentów, instancji, wielokątów i gwiazd. Kliknij przełącznik niezależnych narożników, aby ustawić każdy narożnik (lewy górny, prawy górny, lewy dolny, prawy dolny) osobno; narożniki wielokąta lub gwiazdy mają wspólny promień, który zaokrągla też narożniki wewnętrzne.

Na obszarze roboczym najedź na zaznaczony prostokąt, aby pokazać uchwyt w każdym narożniku, i przeciągnij jeden z nich, aby zaokrąglić narożniki. Równe narożniki zmieniają się razem, a różne pojedynczo; przytrzymaj <kbd>⌥</kbd>, aby odwrócić to zachowanie, i <kbd>⇧</kbd>, aby zaokrąglać do dziesiątek. Wielokąt lub gwiazda ma jeden uchwyt promienia, pod górnym wierzchołkiem, który zaokrągla wszystkie narożniki; przeciągnij uchwyt na następnym wierzchołku wokół środka, aby zmienić liczbę wierzchołków, a uchwyt gwiazdy na pierwszym wierzchołku wewnętrznym do środka lub od środka, aby zmienić jej proporcję. Uchwyty są ukryte, gdy kształt ma na ekranie mniej niż 108 pikseli szerokości; powiększ widok, aby do nich dotrzeć.

### Łuki elipsy

Zaznacz elipsę, aby zobaczyć jej łuk w sekcji Wygląd: **Początek** to kąt, od którego zaczyna się łuk, w stopniach; **Zakres** to część pełnego obrotu, którą obejmuje, w procentach; a **Proporcja** to rozmiar otworu pośrodku jako procent elipsy, do pierścieni i wykresów pierścieniowych. Wpisz wartość lub przeciągnij pole; uchwyty elipsy na obszarze roboczym zmieniają te same trzy wartości.

### Efekty

Efekty wizualne dodaje się w sekcji Efekty:

- **Cień** — przesunięcie, promień rozmycia, rozciągnięcie i kolor;
- **Cień wewnętrzny** — te same ustawienia, renderowany wewnątrz kształtu;
- **Rozmycie warstwy** — rozmywa cały obiekt;
- **Rozmycie tła** — rozmywa zawartość za obiektem;
- **Rozmycie pierwszego planu** — rozmywa zawartość przed obiektem.

Kliknij **+**, aby dodać efekt. Każdy wiersz efektu można zwinąć; ustawienia są w wierszu. Ikona oka włącza i wyłącza efekt.

## Ramki i sekcje

**Ramki** są kontenerami. Przeciągnij kształty do ramki, aby stały się jej elementami, albo zacznij rysować wewnątrz niej: nowy kształt trafia do ramki pod punktem, w którym zaczynasz (z wyjątkiem zablokowanych ramek), i dołącza na końcu przepływu automatycznego układu. Narysowanie ramki nad istniejącymi obiektami umieszcza w niej niezablokowane obiekty, które w całości obejmuje. Nowe ramki przycinają zawartość, jak w Figmie (wyłącz **Przytnij zawartość**, aby elementy były widoczne poza ramką), a ramki obsługują [automatyczny układ](./auto-layout).

Po wybraniu narzędzia Ramka panel Design pokazuje zwijane grupy gotowych rozmiarów dla telefonów, tabletów, komputerów, prezentacji, zegarków, papieru, mediów społecznościowych, zasobów Figma Community i archiwalnych urządzeń. Wybranie rozmiaru tworzy nazwaną ramkę pośrodku widoku i wraca do narzędzia Przesuń. Gdy zaznaczona jest istniejąca ramka, lista **Ustawienie ramki** zmienia jej rozmiar bez zmiany nazwy.

**Sekcje** to kontenery najwyższego poziomu, które przejmują sąsiednie obiekty w całości objęte podczas rysowania, przesuwania lub zmiany rozmiaru. Przydają się do dzielenia dużych obszarów roboczych na logiczne części. Sekcje mają etykietę z tytułem, którą można przeciągać.

## Skróty klawiaturowe

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Prostokąt | <kbd>R</kbd> | <kbd>R</kbd> |
| Elipsa | <kbd>O</kbd> | <kbd>O</kbd> |
| Linia | <kbd>L</kbd> | <kbd>L</kbd> |
| Ramka | <kbd>F</kbd> lub <kbd>A</kbd> | <kbd>F</kbd> lub <kbd>A</kbd> |
| Sekcja | <kbd>⇧</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>S</kbd> |
| Kwadrat lub koło | <kbd>Shift</kbd> + przeciąganie | <kbd>Shift</kbd> + przeciąganie |

## Wskazówki

- Sekcje mogą istnieć tylko na najwyższym poziomie — nie można ich zagnieżdżać w ramkach.
- Ramki z [automatycznym układem](./auto-layout) pozwalają budować układy responsywne.
- [Eksportuj](./exporting) pojedyncze kształty lub grupy jako obrazy z panelu właściwości lub menu kontekstowego.
