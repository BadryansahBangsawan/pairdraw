---
title: Automatyczny układ
description: "Flex i Grid w Pairdraw: kierunek, odstępy, dopełnienie, wyrównanie, rozmiary elementów potomnych i ścieżki CSS Grid."
---

# Automatyczny układ

Automatyczny układ samodzielnie rozmieszcza elementy potomne wewnątrz ramki. Dostępne są dwa tryby: **Flex** (przepływ poziomy lub pionowy) oraz **Grid** (wiersze i kolumny z rozmiarami ścieżek).

## Włączanie

- Zaznacz ramkę i naciśnij <kbd>⇧</kbd><kbd>A</kbd> (<kbd>Shift</kbd> + <kbd>A</kbd>), aby włączyć lub wyłączyć automatyczny układ.
- Zaznacz luźne obiekty (bez ramki nadrzędnej) i naciśnij <kbd>⇧</kbd><kbd>A</kbd>, aby umieścić je w nowej ramce z automatycznym układem.

Podczas umieszczania zaznaczenia w ramce obiekty są sortowane według położenia na ekranie: od lewej do prawej w układzie poziomym, od góry do dołu w pionowym.

## Kierunek

Wybierz sposób rozmieszczenia elementów:

- **Poziomy:** elementy biegną od lewej do prawej.
- **Pionowy:** elementy biegną od góry do dołu.
- **Zawijanie:** po wyczerpaniu miejsca elementy przechodzą do następnego wiersza lub kolumny.

## Odstępy

### Odstęp

Odległość między sąsiednimi elementami. Ustawia się jedną wartość, która obowiązuje między wszystkimi elementami.

### Dopełnienie

Odległość między krawędzią ramki a jej zawartością. Można ustawić jedną wartość dla wszystkich stron albo rozwinąć pole i ustawić każdą stronę osobno (górę, prawą, dół, lewą).

## Wyrównanie

### Oś główna

Określa rozkład elementów wzdłuż kierunku układu:

- **początek** — elementy są dosunięte do początku;
- **środek** — elementy są wyśrodkowane;
- **koniec** — elementy są dosunięte do końca;
- **równy odstęp między elementami** — elementy rozkładają się z równymi odstępami między sobą;
- **Odstęp dookoła** — każdy element dostaje równą część wolnego miejsca, po połowie z każdej strony, oprócz odstępu; opcję wybiera się w menu pola odstępu.

### Oś poprzeczna

Określa położenie elementów prostopadle do kierunku układu:

- **początek** — elementy wyrównują się do początku;
- **środek** — elementy są wyśrodkowane;
- **koniec** — elementy wyrównują się do końca;
- **rozciągnięcie** — elementy rozciągają się na całą oś poprzeczną.

## Rozmiar elementów potomnych

Każdy element w ramce z automatycznym układem może mieć własny tryb rozmiaru:

- **Stały:** używa jawnej szerokości lub wysokości elementu;
- **Wypełnij:** rozciąga się na dostępne miejsce w ramce nadrzędnej;
- **Dopasuj do zawartości:** zmniejsza się do rozmiaru zawartości.

Pierwsza rzeczywista zmiana szerokości lub wysokości przełącza tylko tę oś na tryb stały. Sam fokus pola nie zmienia trybu.

## Uwzględnianie obrysów w układzie

Domyślnie ramka z automatycznym układem rozmieszcza zawartość tak, jakby żadna warstwa nie miała obrysu, tak jak Figma. Włącz **Uwzględnij obrysy w układzie** w sekcji Układ, aby zrobić miejsce na obrysy: obrys samej ramki odsuwa zawartość do wewnątrz, a zewnętrzne obrysy elementów zajmują miejsce między nimi.

## Zmiana kolejności przeciąganiem

Wewnątrz ramki z automatycznym układem przeciągnij element, aby zmienić jego miejsce wśród sąsiadów. Wskaźnik wstawiania pokazuje, gdzie element zostanie upuszczony. Obiekt przeciągnięty z innego miejsca do ramki z automatycznym układem jest wstawiany w ten sam sposób; w ramce z zawijaniem trafia do wiersza pod kursorem. Obiekt narysowany wewnątrz ramki z automatycznym układem trafia na koniec jej przepływu.

Przytrzymaj <kbd>⌃</kbd> (<kbd>Ctrl</kbd> w Windows i Linuksie) podczas przeciągania, aby zignorować automatyczny układ: obiekt zostanie upuszczony w miejscu puszczenia jako element o położeniu bezwzględnym.

## Panel właściwości

Gdy zaznaczona jest ramka z automatycznym układem, sekcja Układ w panelu właściwości pokazuje wszystkie jego ustawienia: kierunek, odstęp, dopełnienie oraz wyrównanie w osi głównej i poprzecznej.

## Skróty klawiaturowe

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Włączenie lub wyłączenie automatycznego układu | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

## CSS Grid

Grid rozmieszcza elementy w wierszach i kolumnach o jawnie określonych rozmiarach ścieżek.

### Włączanie siatki

Zaznacz ramkę z włączonym automatycznym układem i kliknij ikonę siatki na pasku układu, aby przełączyć tryb z Flex na Grid.

### Rozmiary ścieżek

Kolumny i wiersze mają trzy tryby rozmiaru:

- **fr** — jednostka ułamkowa, dzieli dostępne miejsce proporcjonalnie;
- **px** — stała liczba pikseli;
- **auto** — rozmiar dopasowany do zawartości.

Przykład: trzy kolumny `1fr 200px 1fr` dają układ ze stałą kolumną środkową i elastycznymi bokami.

### Odstępy siatki

Odstępy poziome (między kolumnami) i pionowe (między wierszami) ustawia się osobno.

### Położenie elementów

Elementy są automatycznie umieszczane w komórkach w kolejności wierszy. Położenie można zmienić we właściwościach układu elementu, podając początkowy wiersz lub kolumnę oraz liczbę zajmowanych komórek.

### Eksport do JSX i Tailwind

Grid jest eksportowany do JSX z klasami Tailwind, na przykład `grid grid-cols-3`, `gap-x-4 gap-y-2` i `col-start-2 row-span-2`.

## Wskazówki

- Automatyczny układ jest przeliczany od razu po utworzeniu, więc granice zaznaczenia aktualizują się natychmiast.
- Zagnieżdżaj ramki z automatycznym układem, aby tworzyć złożone układy responsywne (np. pionowa ramka z poziomymi wierszami).
- Tryb „Wypełnij” sprawia, że element zajmuje pozostałe miejsce, podobnie jak `flex-grow: 1` w CSS.
- Grid sprawdza się w pulpitach, galeriach, formularzach i wszędzie tam, gdzie struktura jest dwuwymiarowa.
- Tworzenie ramek, do których stosuje się automatyczny układ, opisuje strona [Rysowanie figur](./drawing-shapes).
- Użycie automatycznego układu w komponentach wielokrotnego użytku opisuje strona [Komponenty](./components).
