---
title: Budowanie design systemu
description: Samouczek krok po kroku, który buduje bibliotekę z komponentami Button i Card, z motywami, wariantami, właściwościami komponentów i slotami.
---

# Budowanie design systemu

Ten samouczek buduje od zera mały design system: tokeny kolorów i rozmiarów z jasnym i ciemnym motywem, **Button** z dwoma wariantami oraz **Card**, której treść i akcje są slotami. Każdy krok korzysta z funkcji opisanych dokładniej w sekcjach [Zmienne](./variables), [Automatyczny układ](./auto-layout) i [Komponenty](./components).

[Pobierz gotowy plik](/examples/design-system.fig){download}, aby porównać go ze swoim albo od niego zacząć. Ma dwie strony: **Components** zawiera komponenty główne, a **Examples** pokazuje te same karty w trybach Light i Dark.

## 1. Zdefiniuj tokeny

Tokeny to zmienne, które odczytuje każdy komponent, więc zmiana motywu odbywa się w jednym miejscu.

1. Otwórz **Widok → Zmienne…**.
2. Kliknij **+** obok **Kolekcje** i nazwij kolekcję `Theme`. Zmień nazwę jej pierwszego trybu na `Light`, a następnie kliknij **+** obok **Tryby** i nazwij nowy tryb `Dark`.
3. Kliknij **Utwórz zmienną**, wybierz **Kolor** i dodaj te zmienne z wartością dla każdego trybu. Ukośnik w nazwie grupuje zmienne, więc `color/primary` pojawia się jako *primary* w grupie *color*.

   | Zmienna | Light | Dark |
   | --- | --- | --- |
   | `color/background` | `#F4F5F7` | `#0F1115` |
   | `color/surface` | `#FFFFFF` | `#1A1D23` |
   | `color/border` | `#E1E4EA` | `#2D323B` |
   | `color/text` | `#191C21` | `#F1F3F6` |
   | `color/text-muted` | `#5A616E` | `#A2A9B5` |
   | `color/primary` | `#3451D1` | `#8098F7` |
   | `color/on-primary` | `#FFFFFF` | `#0D1222` |
   | `color/secondary` | `#E9ECF2` | `#272B33` |

4. Utwórz drugą kolekcję o nazwie `Size` ze zmiennymi typu **Liczba**: `radius/control` = 8, `radius/card` = 12, `space/sm` = 8, `space/md` = 16 i `space/lg` = 24. Rozmiary nie zmieniają się razem z motywem, więc ta kolekcja ma jeden tryb.

Arkusz stylów pod listą już pokazuje wynik: wartości Light w `:root` i wartości Dark w `[data-theme="dark"]`.

## 2. Zbuduj Button

1. Zmień nazwę strony na `Components`. Narysuj ramkę, naciśnij <kbd>⇧</kbd><kbd>A</kbd>, aby nadać jej automatyczny układ, i ustaw obie osie na **Dopasuj do zawartości**.
2. Dodaj warstwę tekstową z napisem `Button`, w kroju Inter Medium o rozmiarze 14 px, i nazwij ją `Label`.
3. Powiąż tokeny. W sekcji **Wypełnienie** użyj **Zastosuj zmienną**, aby powiązać wypełnienie ramki z `color/primary`, a wypełnienie tekstu z `color/on-primary`. Pola liczbowe przyjmują zmienne w ten sam sposób: powiąż promień narożników z `radius/control`, a lewy i prawy margines wewnętrzny z `space/md`, a górny i dolny ustaw na 10.
4. Naciśnij <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>), aby utworzyć z niej komponent.
5. Kliknij dwukrotnie wewnątrz komponentu i zaznacz warstwę Label. Obok jej tekstu w sekcji **Typografia** użyj **Zastosuj zmienną/właściwość → Utwórz właściwość…**, aby utworzyć właściwość tekstową o nazwie `Label`. Instancje mogą teraz zmieniać etykietę bez odłączania.
6. Zaznacz komponent i kliknij **Dodaj wariant** w nagłówku panelu. Komponent staje się zestawem z dwoma wariantami. W sekcji **Właściwości** zmień nazwę właściwości wariantu na `Variant`, a jej wartości na `Primary` i `Secondary`, po czym nazwij zestaw `Button`.
7. W wariancie Secondary powiąż wypełnienie z `color/secondary`, a wypełnienie etykiety z `color/text`.
8. Zaznacz zestaw, w sekcji **Zachowanie** kliknij **+** i wybierz **Button**. Podgląd (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> / <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>) uruchamia go teraz jak prawdziwy przycisk.

## 3. Zbuduj Card

1. Narysuj ramkę o szerokości 320 px, nadaj jej pionowy automatyczny układ i ustaw jej wysokość na **Dopasuj do zawartości**. Powiąż jej margines wewnętrzny z `space/lg`, odstęp z `space/md`, promień z `radius/card`, wypełnienie z `color/surface`, a obrys o grubości 1 px z `color/border`.
2. Dodaj warstwę tekstową z napisem `Card title`, w kroju Inter Semi Bold o rozmiarze 18 px, i nazwij ją `Title`. Powiąż jej wypełnienie z `color/text` i ustaw jej szerokość na **Wypełnij**.
3. Pod nią dodaj ramkę o nazwie `Content` z pionowym automatycznym układem, bez wypełnienia, z szerokością **Wypełnij** i wysokością **Dopasuj do zawartości**. Umieść w niej warstwę tekstową, na przykład `Slots hold content that each card chooses for itself.`, w kroju Inter Regular o rozmiarze 14 px, powiązaną z `color/text-muted`, i nazwij ją `Body`.
4. Dodaj ramkę o nazwie `Actions` z poziomym automatycznym układem i odstępem powiązanym z `space/sm`. Przeciągnij do niej Button z sekcji **Zasoby**.
5. Zaznacz zewnętrzną ramkę i utwórz z niej komponent o nazwie `Card`. Powiąż tytuł z właściwością tekstową o nazwie `Title`, tak jak etykietę przycisku.
6. Zaznacz ramkę `Content` i wybierz **Utwórz slot** z menu kontekstowego lub z sekcji **Sloty**. Zrób to samo dla `Actions`. Każda instancja może teraz zastąpić zawartość tych ramek, a zawartość komponentu głównego staje się domyślna.

Ustawienia slotu pozwalają go opisać, ograniczyć liczbę warstw, które mieści, i wskazać preferowane komponenty; na przykład `Actions` może preferować `Button` i mieścić najwyżej 2 warstwy.

## 4. Użyj komponentów

1. Dodaj stronę o nazwie `Examples` i narysuj ramkę o nazwie `Light` z pionowym automatycznym układem, marginesem wewnętrznym i odstępem powiązanymi z `space/lg` oraz wypełnieniem powiązanym z `color/background`.
2. Umieść w niej dwie instancje Card: kliknij Card prawym przyciskiem i wybierz **Utwórz instancję** albo przeciągnij ją z sekcji **Zasoby**. Ustaw ich właściwość **Title** na `Welcome back` i `Pro plan`.
3. W drugiej karcie zaznacz przycisk w slocie `Actions` i usuń go, a następnie wklej lub przeciągnij dwie instancje Button: Secondary z etykietą `Not now` i Primary z `Upgrade`. Zmień tekst w jej slocie `Content`. Zawartość slotu należy do instancji, więc zostaje, gdy Card się zmienia; **Resetuj slot** w menu slotu przywraca zawartość komponentu.
4. Zduplikuj ramkę `Light` i nazwij kopię `Dark`. W sekcji **Wygląd** użyj **Zastosuj tryb zmiennych**, aby ustawić kolekcję `Theme` na `Dark`. Wszystkie powiązane kolory w ramce się zmieniają, a karty pozostają połączone ze swoimi komponentami.

Teraz zmień token lub komponent główny, na przykład `radius/card` albo margines wewnętrzny Button, i zobacz, jak obie ramki się aktualizują.

## 5. Co dalej

- **Opublikuj go jako bibliotekę.** Otwórz **Zasoby → Zarządzaj bibliotekami → Publikuj bibliotekę**, aby inne pliki mogły używać Button i Card oraz przyjmować aktualizacje, gdy je zmienisz ([Biblioteki komponentów](./components#component-libraries)).
- **Przekaż tokeny do kodu.** `pairdraw tokens design-system.fig` wypisuje zmienne jako niestandardowe właściwości CSS, `--format tailwind` jako motyw Tailwind v4, a `--format dtcg --out tokens/` jako pliki tokenów projektowych W3C. Eksport HTML zapisuje powiązane wartości jako odwołania `var()` do tych samych właściwości ([Eksport](./exporting)).
- **Sprawdź go.** [Sprawdzanie projektów](/user-guide/checking-designs) i `pairdraw lint design-system.fig --fix -o fixed.fig` znajdują kolory, które odpowiadają tokenowi, ale nie są z nim powiązane, i je wiążą.
- **Śledź zmiany.** Trzymaj plik w Git i przeglądaj zmiany za pomocą [`pairdraw diff files`](/pl/programmable/cli/git).

## Zbuduj przykład skryptem

Plik przykładowy jest generowany przez ten skrypt, który korzysta z tego samego [API wtyczek zgodnego z Figmą](/pl/programmable/cli/scripting) co `pairdraw eval`. Uruchom go, aby samodzielnie zbudować plik, albo zmień go, aby wypróbować własne tokeny:

```sh
echo '{"children":[]}' > empty.pen
pairdraw eval empty.pen --stdin -o design-system.fig < design-system.js
```

<<< @/public/examples/design-system.js
