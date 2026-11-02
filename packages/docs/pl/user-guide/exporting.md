---
title: Eksport i pliki
description: Eksport obrazów, SVG i wybranych obiektów do .fig oraz otwieranie dokumentów .fig i .pen.
---

# Eksport i pliki

OpenPencil eksportuje pojedyncze obiekty jako obrazy, SVG albo osobne dokumenty `.fig`. Edytor otwiera pełne dokumenty `.fig` i `.pen`.

## Eksport obrazów

Zaznacz obiekt i otwórz sekcję „Eksport” na panelu właściwości.

### Ustawienia

- **Skala:** od 0,5× do 4×. Dla SVG nie jest wyświetlana, ponieważ grafika wektorowa nie zależy od rozdzielczości.
- **Format:** PNG z przezroczystym tłem, JPG z białym tłem, WEBP z przezroczystym tłem, SVG, PDF, HTML, PPTX (PowerPoint) albo draw.io.

Dla jednego obiektu można dodać kilka wariantów eksportu. Podgląd na tle szachownicy pokazuje przyszły wynik.

### Sposoby eksportu

| Sposób | macOS | Windows / Linux |
|--------|-------|-----------------|
| Skrót | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Menu kontekstowe | Prawy przycisk → Eksport… | Prawy przycisk → Eksport… |
| Panel właściwości | Przycisk Eksport | Przycisk Eksport |

W aplikacji komputerowej ścieżkę wybiera się w oknie systemowym. W przeglądarce plik jest pobierany w zwykły sposób.

## HTML, PDF i jakość

- **Wiersze JPG i WEBP** mają pole jakości od 1 do 100 (domyślnie 90), zapisywane razem z warstwą.
- **PDF** przy kilku zaznaczonych warstwach tworzy jeden plik PDF ze stroną na każdą warstwę, w kolejności zaznaczenia, każdą w rozmiarze swojej warstwy.
- **Plik › Eksportuj ramki do PDF…** zapisuje ramki strony jako jeden plik PDF, ze stroną na każdą ramkę w kolejności warstw, każdą w rozmiarze swojej ramki. Liczą się też ramki w sekcjach, a luźne kształty, teksty i grupy nie. Przy zaznaczonych warstwach eksportowane są tylko one.
- **HTML** zapisuje warstwę jako stronę internetową. Przycisk opcji obok formatu decyduje, czy dołączyć szkielet HTML (cała strona albo fragment do wklejenia), czy stylować przez CSS czy Tailwind, czy osadzić obrazy, czy zapisać je jako osobne pliki (razem w pliku `.zip`), oraz czy zapisywać jako atrybuty nazwy warstw (`data-name`, domyślnie włączone) i identyfikatory warstw (`data-open-pencil-node-id`, domyślnie wyłączone). Widok HTML panelu Kod eksportuje tak samo, ze stylowaniem, które pokazuje.
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

OpenPencil używa binarnego formatu `.fig` Figmy i otwiera również dokumenty `.pen`.

### Otwieranie

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Otwórz plik | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |

### Zapisywanie

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Zapisz | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Zapisz jako | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

**Zapisz** nadpisuje bieżący plik, jeśli OpenPencil nadal ma uprawnienia do zapisu. **Zapisz jako** pozwala wybrać nową ścieżkę.

W Chrome i Edge przeglądarka korzysta z File System Access API. Inne przeglądarki, w tym Safari, pobierają plik.

Zapisany plik jest skompresowany i zawiera miniaturę widoczną w menedżerze plików.

### Zgodność z Figmą

Pliki wyeksportowane z OpenPencil można otworzyć w Figmie, a dokumenty Figmy — w OpenPencil. Format `.fig` zachowuje typy obiektów, właściwości, zalewy, obwiednie, efekty, dane wektorowe i parametry układu.

## Wskazówki

- Dla ekranów o dużej gęstości pikseli używaj skali 2× lub 3×.
- JPG zawsze otrzymuje białe tło. Do przezroczystości wybierz PNG lub WEBP.
- SVG nadaje się do dalszej edycji w Illustratorze, Inkscape lub kodzie.
