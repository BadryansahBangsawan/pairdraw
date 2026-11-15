---
title: Eksport i pliki
description: Eksport obrazów, SVG i wybranych obiektów do .fig oraz otwieranie dokumentów .fig i .pen.
---

# Eksport i pliki

Pairdraw eksportuje pojedyncze obiekty jako obrazy, SVG albo osobne dokumenty `.fig`. Edytor otwiera pełne dokumenty `.fig` i `.pen`.

## Eksport obrazów

Zaznacz obiekt i otwórz sekcję „Eksport” na panelu właściwości.

### Ustawienia

- **Skala:** od 0,5× do 4×. Dla SVG nie jest wyświetlana, ponieważ grafika wektorowa nie zależy od rozdzielczości.
- **Format:** PNG z przezroczystym tłem, JPG z białym tłem, WEBP z przezroczystym tłem, SVG, PDF albo HTML.

Dla jednego obiektu można dodać kilka wariantów eksportu. Podgląd na tle szachownicy pokazuje przyszły wynik.

Aplikacja nie oferuje eksportu do PowerPoint (`.pptx`) ani draw.io. [CLI](/reference/cli#export) nadal eksportuje oba formaty: `pairdraw export design.fig -f pptx` albo `-f drawio`.

### Sposoby eksportu

| Sposób | macOS | Windows / Linux |
|--------|-------|-----------------|
| Skrót (PNG) | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Menu kontekstowe | Prawy przycisk → Eksport… | Prawy przycisk → Eksport… |
| Panel właściwości | Przycisk Eksport | Przycisk Eksport |

W aplikacji komputerowej ścieżkę wybiera się w oknie systemowym. W przeglądarce plik jest pobierany w zwykły sposób.

## HTML, PDF i jakość

- **Wiersze JPG i WEBP** mają pole jakości od 1 do 100 (domyślnie 90), zapisywane razem z warstwą.
- **PDF** przy kilku zaznaczonych warstwach tworzy jeden plik PDF ze stroną na każdą warstwę, w kolejności zaznaczenia, każdą w rozmiarze swojej warstwy.
- **Plik › Eksportuj ramki do PDF…** zapisuje ramki strony jako jeden plik PDF, ze stroną na każdą ramkę w kolejności warstw, każdą w rozmiarze swojej ramki. Liczą się też ramki w sekcjach, a luźne kształty, teksty i grupy nie. Przy zaznaczonych warstwach eksportowane są tylko one.
- **HTML** zapisuje warstwę jako stronę internetową. Przycisk opcji obok formatu decyduje, czy dołączyć szkielet HTML (cała strona albo fragment do wklejenia), czy stylować przez CSS czy Tailwind, czy osadzić obrazy, czy zapisać je jako osobne pliki (razem w pliku `.zip`), oraz czy zapisywać jako atrybuty nazwy warstw (`data-name`, domyślnie włączone) i identyfikatory warstw (`data-pairdraw-node-id`, domyślnie wyłączone). Widok HTML panelu Kod eksportuje tak samo, ze stylowaniem, które pokazuje.
- W panelu Kod komponenty Vue i React mogą brać ikony z Lucide, Heroicons lub Font Awesome zamiast z Iconify, a komponenty React także z React Icons; ikona, której pakiet nie ma, zostaje przy Iconify.

## Kopiuj jako

Menu kontekstowe umieszcza zaznaczenie w schowku w kilku formatach:

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Kopiuj jako tekst | — | — |
| Kopiuj jako SVG | — | — |
| Kopiuj jako PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Kopiuj jako JSX | — | — |

Tekst jest kopiowany z widocznej zawartości, SVG jako znaczniki, PNG w skali 2×, a JSX w formacie zgodnym z `renderJsx()`.

## Dokumenty .fig i .pen

Pairdraw używa binarnego formatu `.fig` Figmy i otwiera również dokumenty `.pen`.

### Otwieranie

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Otwórz plik | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |

Dokument `.pen`, który importuje biblioteki `.pen`, otwiera się z używanymi komponentami bibliotek, wczytanymi z plików wskazanych względem dokumentu. W dokumencie są to komponenty biblioteki tylko do odczytu; zmieniaj je w bibliotece. Przeglądarka nie może czytać plików obok dokumentu, więc tam te komponenty są przerywanymi symbolami zastępczymi, a komunikat podaje nazwy bibliotek; otwórz plik w aplikacji desktopowej lub w CLI, aby je wczytać. Aplikacja desktopowa czyta biblioteki najwyżej dwa foldery nad dokumentem, ale nigdy z folderu domowego ani wyżej i nie przez dowiązania; plik upuszczony na okno nie wczytuje żadnych, więc otwórz go przez Plik > Otwórz…. CLI czyta biblioteki w katalogu roboczym. Węzły skryptu i przeglądarki, których Pairdraw nie uruchamia, również otwierają się jako symbole zastępcze z zachowanym plikiem skryptu lub adresem strony.

### Zapisywanie

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Zapisz | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Zapisz jako | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

**Zapisz** nadpisuje bieżący plik, jeśli Pairdraw nadal ma uprawnienia do zapisu. **Zapisz jako** pozwala wybrać nową ścieżkę.

W Chrome i Edge przeglądarka korzysta z File System Access API. Inne przeglądarki, w tym Safari, pobierają plik.

Zapisany plik jest skompresowany i zawiera miniaturę widoczną w menedżerze plików.

### Zgodność z Figmą

Pliki wyeksportowane z Pairdraw można otworzyć w Figmie, a dokumenty Figmy — w Pairdraw. Format `.fig` zachowuje typy obiektów, właściwości, zalewy, obwiednie, efekty, dane wektorowe i parametry układu.

## Wskazówki

- Dla ekranów o dużej gęstości pikseli używaj skali 2× lub 3×.
- JPG zawsze otrzymuje białe tło. Do przezroczystości wybierz PNG lub WEBP.
- SVG nadaje się do dalszej edycji w Illustratorze, Inkscape lub kodzie.
