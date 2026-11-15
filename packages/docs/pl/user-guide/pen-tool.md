---
title: Narzędzie Pióro
description: Rysowanie ścieżek wektorowych z krzywymi Béziera narzędziem Pióro w Pairdraw.
---

# Narzędzie Pióro

Pióro tworzy ścieżki wektorowe na podstawie modelu sieci wektorowej, zgodnego z formatem `.fig` Figmy.

## Włączanie

Naciśnij <kbd>P</kbd>, aby włączyć narzędzie Pióro.

## Tworzenie punktów

- Kliknij raz, aby umieścić punkt narożny i utworzyć prosty segment.
- Kliknij i przeciągnij, aby umieścić punkt krzywej z uchwytami Béziera. Kierunek i odległość przeciągania określają kształt krzywej.
- Nie zwalniając przycisku myszy, przytrzymaj <kbd>Space</kbd>, aby przesunąć właśnie tworzony punkt.

Dodawaj kolejne punkty, aby budować ścieżkę segment po segmencie. Linia podglądu łączy ostatni punkt z bieżącym położeniem wskaźnika.

## Zamknięta ścieżka

Kliknij pierwszy punkt ścieżki, aby ją zamknąć. Zamknięta ścieżka może mieć wypełnienie.

## Otwarta ścieżka

Naciśnij <kbd>Escape</kbd>, aby zakończyć ścieżkę bez zamykania. Otwarta ścieżka jest wyświetlana tylko jako obrys — nie ma wypełnienia.

## Sieci wektorowe

Zamiast prostej sekwencji punktów Pairdraw używa sieci wektorowej. Model ten obsługuje rozgałęzienia i złożoną topologię. Figma stosuje ten sam model, dlatego ścieżki są w pełni zachowywane podczas importu i eksportu `.fig`.

## Ołówek

Naciśnij <kbd>⇧</kbd><kbd>P</kbd> albo wybierz Ołówek z menu narzędzia Pióro na pasku narzędzi, aby rysować odręcznie. Każde pociągnięcie staje się osobną warstwą wektorową, wygładzoną do krzywych, które edytujesz jak każdą inną ścieżkę, a ołówek pozostaje aktywny dla następnego pociągnięcia.

- Powiększ widok, aby zachować więcej szczegółów: krzywa odwzorowuje pociągnięcie z dokładnością do kilku pikseli ekranu.
- Przytrzymaj <kbd>Shift</kbd>, aby rysować prosto, poziomo lub pionowo, od miejsca, w którym go wcisnąłeś.
- Zakończ pociągnięcie w miejscu, w którym się zaczęło, aby zamknąć je w pętlę.
- Pociągnięcie trafia do ramki, która mieści je w całości, a w przeciwnym razie na stronę.
- Nowe pociągnięcia kontrastują z tym, na czym są rysowane. Zmień obrys ostatniego narysowanego, a ołówek zachowa ten styl.

## Edycja istniejącej ścieżki

Przy aktywnym Piórze:

- kliknij punkt końcowy otwartej ścieżki, aby kontynuować rysowanie;
- kliknij segment, aby dodać punkt;
- przytrzymaj <kbd>Option</kbd> albo <kbd>Alt</kbd> i kliknij punkt, aby go usunąć, jeśli pozwala na to topologia.

## Skróty klawiaturowe

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Pióro | <kbd>P</kbd> | <kbd>P</kbd> |
| Ołówek | <kbd>⇧</kbd><kbd>P</kbd> | <kbd>Shift</kbd> + <kbd>P</kbd> |
| Zakończ otwartą ścieżkę | <kbd>Escape</kbd> | <kbd>Escape</kbd> |

## Wskazówki

- Linia podglądu zawsze zaczyna się w ostatnim dodanym punkcie — nie przeskakuje do (0,0).
- Im dalej przeciągniesz wskaźnik podczas tworzenia punktu krzywej, tym dłuższe będą uchwyty Béziera.
- Po utworzeniu ścieżki dostosuj jej wypełnienie, obrys i efekty w panelu właściwości.
