---
title: Eksport i pliki
description: Eksport obrazów, SVG i wybranych obiektów do .fig oraz otwieranie dokumentów .fig i .pen w Pairdraw.
---

# Eksport i pliki

Pairdraw eksportuje pojedyncze obiekty jako obrazy albo osobne dokumenty `.fig` i otwiera pełne dokumenty `.fig` i `.pen`.

## Eksport obrazów

Zaznacz obiekt i użyj sekcji Eksport w panelu właściwości.

### Ustawienia eksportu

- **Skala:** 0,5×, 0,75×, 1×, 1,5×, 2×, 3× lub 4× (ukryta dla SVG — grafika wektorowa nie zależy od rozdzielczości).
- **Format:** PNG (przezroczyste tło), JPG (białe tło), WEBP (przezroczyste tło), SVG (wektor), PDF albo HTML.

**Plik → Eksportuj zaznaczenie…** eksportuje zaznaczenie jako PNG, SVG lub `.fig`, a <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> od razu eksportuje je jako PNG.

Aplikacja nie oferuje eksportu do PowerPoint (`.pptx`) ani draw.io. [CLI](/reference/cli#export) nadal eksportuje oba formaty: `pairdraw export design.fig -f pptx` albo `-f drawio`.

Można dodać kilka ustawień eksportu, aby jednym ruchem wyeksportować ten sam obiekt w różnych skalach lub formatach. Podgląd na żywo na tle szachownicy pokazuje, co zostanie wyeksportowane.

### Sposoby eksportu

| Sposób | macOS | Windows / Linux |
|--------|-------|-----------------|
| Skrót klawiaturowy (PNG) | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Menu Plik | **Plik → Eksportuj zaznaczenie** (PNG, SVG lub `.fig`) | **Plik → Eksportuj zaznaczenie** (PNG, SVG lub `.fig`) |
| Panel właściwości | Przycisk „Eksport” | Przycisk „Eksport” |

Wyeksportowany plik zapisuje się przez systemowe okno dialogowe (aplikacja na komputer) albo jako pobranie w przeglądarce.

## HTML, PDF i jakość

- **Wiersze JPG i WEBP** mają pole jakości od 1 do 100 (domyślnie 90), zapisywane razem z warstwą.
- **PDF** przy kilku zaznaczonych warstwach tworzy jeden plik PDF ze stroną na każdą warstwę, w kolejności zaznaczenia, każdą w rozmiarze swojej warstwy.
- **Plik › Eksportuj ramki do PDF…** zapisuje ramki strony jako jeden plik PDF, ze stroną na każdą ramkę w kolejności warstw, każdą w rozmiarze swojej ramki. Liczą się też ramki w sekcjach, a luźne kształty, teksty i grupy nie. Przy zaznaczonych warstwach eksportowane są tylko one.
- **HTML** zapisuje warstwę jako stronę internetową. Przycisk opcji obok formatu decyduje, czy dołączyć szkielet HTML (cała strona albo fragment do wklejenia), czy stylować przez CSS czy Tailwind, czy osadzić obrazy, czy zapisać je jako osobne pliki (razem w pliku `.zip`), oraz czy zapisywać jako atrybuty nazwy warstw (`data-name`, domyślnie włączone) i identyfikatory warstw (`data-pairdraw-node-id`, domyślnie wyłączone). Widok HTML panelu Kod eksportuje tak samo, ze stylowaniem, które pokazuje.
- W panelu Kod komponenty Vue i React mogą brać ikony z Lucide, Heroicons lub Font Awesome zamiast z Iconify, a komponenty React także z React Icons; ikona, której pakiet nie ma, zostaje przy Iconify.

## Kopiuj/Wklej jako

Oprócz eksportu do pliku możesz skopiować zaznaczenie do schowka w kilku formatach przez menu kontekstowe (prawy przycisk → Kopiuj/Wklej jako):

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Kopiuj jako tekst | — | — |
| Kopiuj jako SVG | — | — |
| Kopiuj jako PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Kopiuj jako JSX | — | — |

- **Kopiuj jako tekst** — kopiuje widoczną treść tekstową zaznaczenia.
- **Kopiuj jako SVG** — kopiuje zaznaczenie jako znaczniki SVG (do wklejenia w edytorach kodu, Inkscape itp.).
- **Kopiuj jako PNG** — renderuje w skali 2× i kopiuje do schowka (gotowe do wklejenia w Slacku, Notion itp.).
- **Kopiuj jako JSX** — kopiuje reprezentację Pairdraw JSX (zgodną z `renderJSX()`).

## Dokumenty .fig i .pen

Pairdraw używa formatu `.fig` dla pełnych dokumentów — tego samego formatu binarnego co Figma — i otwiera również dokumenty `.pen`.

### Otwieranie

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Otwórz plik | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |

Otwiera się okno wyboru pliku z filtrem na pliki `.fig` i `.pen`. W aplikacji na komputer jest to systemowe okno dialogowe.

Możesz też przeciągnąć na okno plik `.fig`, `.pen` lub inny obsługiwany dokument; otworzy się w nowej karcie. Obrazy i pliki SVG upuszczone na obszar roboczy są zamiast tego umieszczane w dokumencie, a każdy inny plik zgłasza, że nie można go otworzyć.

Dokument `.pen`, który importuje biblioteki `.pen`, otwiera się z używanymi komponentami bibliotek, wczytanymi z plików wskazanych względem dokumentu. W dokumencie są to komponenty biblioteki tylko do odczytu; zmieniaj je w bibliotece. Przeglądarka nie może czytać plików obok dokumentu, więc tam te komponenty są przerywanymi symbolami zastępczymi, a komunikat podaje nazwy bibliotek; otwórz plik w aplikacji desktopowej lub w CLI, aby je wczytać. Aplikacja desktopowa czyta biblioteki najwyżej dwa foldery nad dokumentem, ale nigdy z folderu domowego ani wyżej i nie przez dowiązania; plik upuszczony na okno nie wczytuje żadnych, więc otwórz go przez Plik > Otwórz…. CLI czyta biblioteki w katalogu roboczym. Węzły skryptu i przeglądarki, których Pairdraw nie uruchamia, również otwierają się jako symbole zastępcze z zachowanym plikiem skryptu lub adresem strony.

### Zapisywanie

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Zapisz | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Zapisz jako | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

- **Zapisz** nadpisuje bieżący plik bez okna dialogowego, jeśli Pairdraw nadal ma uprawnienia do zapisu.
- **Zapisz jako** otwiera okno zapisu, w którym wybierasz nowe miejsce.

W Chrome i Edge przeglądarka korzysta z File System Access API. Inne przeglądarki, w tym Safari, pobierają plik.

Zapisane pliki są skompresowane i zawierają miniaturę widoczną w menedżerach plików.

Gdy nic nie jest zaznaczone, sekcja **Dokument** w panelu Design określa stopień kompresji dokumentu. **Szybka** odpowiada zapisowi samej Figmy. **Mniejszy plik** i **Najmniejszy plik** zmniejszają plik, ale wydłużają zapis, co najbardziej widać w dużych dokumentach, a najmniej w plikach złożonych głównie z obrazów. Wybór jest zapisywany w pliku, a Figma otwiera wszystkie trzy warianty.

### Zgodność w obie strony

Pliki wyeksportowane z Pairdraw można otworzyć w Figmie i odwrotnie. Format `.fig` zachowuje wszystkie typy obiektów, właściwości, wypełnienia, obrysy, efekty, dane wektorowe i ustawienia układu.

## Skróty klawiaturowe

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Eksportuj zaznaczenie jako PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Kopiuj jako PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Otwórz plik | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |
| Zapisz | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Zapisz jako | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

## Wskazówki

- Dla ekranów o dużej gęstości pikseli eksportuj w skali 2× lub 3×.
- JPG zawsze ma białe tło — jeśli potrzebujesz przezroczystości, użyj PNG lub WEBP.
- Eksport SVG przydaje się, gdy potrzebujesz formatu wektorowego do dalszej edycji w Illustratorze, Inkscape lub kodzie.
- Miniatura w wyeksportowanych plikach `.fig` umożliwia podgląd w menedżerach plików i w oknie wyboru plików Figmy.
