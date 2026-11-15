---
title: Zaznaczanie i przekształcanie
description: Wybieranie, przesuwanie, zmiana rozmiaru, obracanie, duplikowanie i porządkowanie obiektów w Pairdraw.
---

# Zaznaczanie i przekształcanie

Zaznacz obiekty, aby je przesuwać, zmieniać ich rozmiar, obracać, duplikować i porządkować na obszarze roboczym.

## Zaznaczanie

- **Kliknij** obiekt, aby go zaznaczyć (usuwa to resztę zaznaczenia). Jak w Figmie, kliknięcie wewnątrz ramki najwyższego poziomu zaznacza bezpośredni element tej ramki, np. zagnieżdżoną ramkę lub grupę, a nie najgłębszą warstwę; ramkę najwyższego poziomu kliknij za jej tytuł, w dowolnym miejscu, gdy jest pusta, albo w odstępach i dopełnieniu, gdy ma automatyczny układ.
- **Najedź** na ramkę z automatycznym układem, aby zobaczyć jej bezpośrednie elementy obrysowane kropkowaną linią; gdy zaznaczona jest jedna warstwa, krawędź jej ramki nadrzędnej z automatycznym układem jest kropkowana.
- **Kliknij dwukrotnie**, aby zejść o poziom głębiej, albo kliknij ponownie wewnątrz zaznaczonej ramki, komponentu lub instancji; gdy warstwa jest już zaznaczona, kliknięcia trafiają bezpośrednio do jej sąsiadów i kuzynów.
- <kbd>⌘</kbd> + kliknięcie (<kbd>Ctrl</kbd> + kliknięcie w Windows i Linuksie) zaznacza najgłębszą warstwę pod kursorem; przytrzymanie <kbd>⌘</kbd> podświetla tę warstwę przed kliknięciem.
- <kbd>Shift</kbd> + kliknięcie dodaje obiekt do zaznaczenia albo z niego usuwa. Warstwa i jej własny element nadrzędny lub podrzędny nigdy nie są zaznaczone razem, więc Shift + kliknięcie jednego zastępuje drugi.
- **Kliknij dwukrotnie nazwę ramki lub komponentu** nad nią na obszarze roboczym, aby zmienić ją w miejscu.
- **Zaznaczanie prostokątem** — przeciągnij po pustym obszarze, aby narysować prostokąt zaznaczenia; po puszczeniu przycisku zaznaczone zostają przecinające się obiekty. Rozpoczęte wewnątrz ramki najwyższego poziomu bez automatycznego układu albo wewnątrz sekcji zaznacza warstwy tego kontenera; rozpoczęte na stronie zaznacza ramkę lub sekcję zawierającą warstwy tylko wtedy, gdy obejmie ją w całości.
- <kbd>⌘</kbd> + przeciąganie (<kbd>Ctrl</kbd> + przeciąganie w Windows i Linuksie) rysuje prostokąt, który zaznacza najgłębiej zagnieżdżone warstwy, których dotyka. Zaczyna się tam, gdzie zwykłe zaznaczanie prostokątem: na pustym obszarze lub pustym tle ramki najwyższego poziomu albo sekcji. Na warstwie albo na tle zagnieżdżonej ramki, komponentu lub instancji <kbd>⌘</kbd> + przeciąganie zaznacza tę warstwę i ją przesuwa. Wciśnij lub puść <kbd>⌘</kbd> w trakcie przeciągania, aby przełączać się między zaznaczaniem głębokim a zwykłym.
- <kbd>⌘</kbd><kbd>A</kbd> — zaznacza wszystkie obiekty bieżącej strony.
- <kbd>Enter</kbd> — zaznacza elementy zaznaczonych warstw; na wektorze otwiera edycję ścieżki, a na tekście edycję tekstu.
- <kbd>Shift</kbd> + <kbd>Enter</kbd> lub <kbd>\\</kbd> — zaznacza element nadrzędny zaznaczonych warstw.
- <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> — zaznacza następnego lub poprzedniego sąsiada, idąc w dół lub w górę panelu warstw i zawijając na końcach.
- **Kliknij pusty obszar**, aby usunąć zaznaczenie.

## Przesuwanie

- **Przeciągnij** zaznaczony obiekt, aby go przesunąć (wszystkie zaznaczone obiekty przesuwają się razem).
- **Klawisze strzałek** przesuwają zaznaczenie o małe przesunięcie, domyślnie 1 px.
- <kbd>Shift</kbd> + strzałka przesuwa je o duże przesunięcie, domyślnie 10 px.

Obie odległości ustawisz w **Ustawienia → Edytor → Przesuwanie strzałkami**.

## Zmiana rozmiaru

Zaznaczone obiekty mają osiem uchwytów zmiany rozmiaru (cztery w narożnikach i cztery w środkach boków). Przeciągnij dowolny uchwyt, aby zmienić rozmiar.

- <kbd>Shift</kbd> + przeciąganie narożnego uchwytu zachowuje proporcje.

## Narzędzie Skalowanie

Naciśnij <kbd>K</kbd> lub wybierz **Skalowanie** z menu narzędzia Przesuń na pasku narzędzi, aby skalować warstwy razem z całą zawartością: rozmiary tekstu, obrysy, efekty, promienie narożników i odstępy automatycznego układu rosną i maleją razem z warstwą, jak w narzędziu Scale w Figmie. Przeciągnij uchwyt zaznaczenia, aby skalować od przeciwnej strony, lub przytrzymaj <kbd>Option</kbd>/<kbd>Alt</kbd>, aby skalować od środka; kilka zaznaczonych warstw skaluje się razem wokół wspólnej ramki ograniczającej.

Gdy narzędzie Skalowanie jest włączone, panel Design pokazuje szerokość i wysokość zaznaczenia, współczynnik skali i siatkę punktu zaczepienia. Wpisana szerokość lub wysokość skaluje zaznaczenie proporcjonalnie; współczynnik przyjmuje `2`, `2x` lub `200%`. Siatka wybiera punkt, który pozostaje na miejscu. Każde skalowanie to jeden krok cofania.

## Przenoszenie do ramek i z ramek

Przeciągany obiekt trafia po puszczeniu do ramki pod kursorem, choćby tylko niewielka jego część była wewnątrz, i opuszcza swoją ramkę, gdy tylko opuści ją kursor. Grupy i zablokowane ramki nigdy nie przyjmują upuszczanych obiektów, a zestaw komponentów przyjmuje z powrotem tylko własne warianty; obiekt wewnątrz grupy pozostaje w niej, chyba że upuścisz go na innej ramce, a grupa dopasowuje rozmiar do zawartości. Grupa, którą opuści ostatni obiekt, zostaje usunięta. Wciśnięcie przycisku wewnątrz zaznaczonej ramki, grupy lub zestawu komponentów przeciąga ją, a nie obiekt pod kursorem.

- <kbd>Shift</kbd> + przeciąganie — przesuwanie tylko w jednej osi.
- Przytrzymanie <kbd>Spacja</kbd> podczas przeciągania — obiekty pozostają w swoich obecnych elementach nadrzędnych.
- <kbd>⌃</kbd> + przeciąganie (<kbd>Ctrl</kbd> + przeciąganie w Windows i Linuksie) — wyłącza przyciąganie; po upuszczeniu w ramce z automatycznym układem obiekt ma położenie bezwzględne.

Zablokowane obiekty w zaznaczeniu pozostają na miejscu, gdy reszta zaznaczenia się przesuwa.

## Obrót

Umieść wskaźnik tuż poza narożnym uchwytem, aby zobaczyć kursor obrotu. Przeciągnij, aby obrócić.

- <kbd>Shift</kbd> + przeciąganie przyciąga kąt co 15°.

## Duplikowanie

- <kbd>Alt</kbd> + przeciąganie (<kbd>⌥</kbd> + przeciąganie w macOS) — duplikuje zaznaczony obiekt i przesuwa kopię.
- <kbd>⌘</kbd><kbd>D</kbd> — duplikuje w miejscu; kopia pojedynczej ramki najwyższego poziomu, na stronie lub w sekcji, trafia w pierwsze wolne miejsce po jej prawej stronie.

Duplikaty zachowują nazwy. Duplikowanie w ten sposób głównego komponentu tworzy jego instancję.

## Wklejanie

<kbd>⌘</kbd><kbd>V</kbd> zachowuje skopiowane położenie. Obiekty wklejone do zaznaczonej ramki zachowują przesunięcie względem ramki, z której zostały skopiowane, i są wyśrodkowane w każdej osi, w której się nie mieszczą; obiekty, które trafiłyby poza widok, są w nim wyśrodkowane. Aby wkleić w miejscu kursora, użyj **Wklej tutaj** w [menu kontekstowym](./context-menu).

## Usuwanie

Naciśnij <kbd>Backspace</kbd> lub <kbd>Delete</kbd>, aby usunąć wszystkie zaznaczone obiekty.

## Kolejność nakładania

Zmiana kolejności obiektów w obrębie elementu nadrzędnego:

- <kbd>]</kbd> — przeniesienie na wierzch (na początek listy sąsiadów);
- <kbd>[</kbd> — przeniesienie na spód (na koniec listy sąsiadów).

## Widoczność i blokada

- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> — przełącza widoczność. Ukryte obiekty nie są renderowane, ale pozostają w panelu warstw.
- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> — przełącza blokadę. Zablokowanych obiektów nie można zaznaczać ani przesuwać na obszarze roboczym.

## Przenoszenie na inną stronę

Zaznaczone obiekty przeniesiesz na inną stronę przez [menu kontekstowe](./context-menu). Trafiają one na obszar roboczy strony docelowej.

## Edycja kilku warstw

Gdy zaznaczonych jest kilka warstw, panel właściwości pokazuje to, co mają wspólnego, a tam, gdzie się różnią, wyświetla **Mieszane**; zmiana dotyczy wszystkich w jednym kroku cofania.

- **Układ** pokazuje ich rozmiary, zmianę rozmiaru tekstu, gdy zaznaczony jest tekst, przepływ, gdy każda warstwa jest ramką, oraz przycinanie zawartości dla ramek wśród nich. Gdy warstwy tworzą jeden wiersz lub kolumnę, **Odstęp** pokazuje odstęp między nimi; wpisanie wartości rozmieszcza je równomiernie od pierwszej warstwy.
- **Typografia** pojawia się zawsze, gdy zaznaczony jest tekst, i zmienia tylko tekst.
- **Obrys** pokazuje obrys warstw, które go mają; jego edycja dodaje obrys każdej zaznaczonej warstwie.
- **Kolory zaznaczenia** wymienia wszystkie kolory wypełnień i obrysów w zaznaczeniu, także wewnątrz ramek i grup, od najczęściej używanych. Zmiana jednego koloru zmienia go wszędzie, gdzie jest używany.

## Sekcje

Sekcja przejmuje sąsiednie obiekty, które w całości obejmuje, gdy ją nad nimi rysujesz, przesuwasz lub zmieniasz jej rozmiar.

## Skróty klawiaturowe

| Działanie | macOS | Windows / Linux |
|-----------|-------|-----------------|
| Zaznacz wszystko | <kbd>⌘</kbd><kbd>A</kbd> | <kbd>Ctrl</kbd> + <kbd>A</kbd> |
| Duplikuj | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| Duplikuj i przesuń | <kbd>⌥</kbd> + przeciąganie | <kbd>Alt</kbd> + przeciąganie |
| Narzędzie Skalowanie | <kbd>K</kbd> | <kbd>K</kbd> |
| Przesuwanie w jednej osi | <kbd>⇧</kbd> + przeciąganie | <kbd>Shift</kbd> + przeciąganie |
| Zachowanie obecnego elementu nadrzędnego | <kbd>Spacja</kbd> podczas przeciągania | <kbd>Spacja</kbd> podczas przeciągania |
| Przesuwanie bez przyciągania | <kbd>⌃</kbd> + przeciąganie | <kbd>Ctrl</kbd> + przeciąganie |
| Usuń | <kbd>⌫</kbd> / Delete | <kbd>Backspace</kbd> / Delete |
| Przesunięcie o 1 px | Klawisze strzałek | Klawisze strzałek |
| Przesunięcie o 10 px | <kbd>⇧</kbd> + klawisze strzałek | <kbd>Shift</kbd> + klawisze strzałek |
| Przenieś na wierzch | <kbd>]</kbd> | <kbd>]</kbd> |
| Przenieś na spód | <kbd>[</kbd> | <kbd>[</kbd> |
| Przełączenie widoczności | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>H</kbd> |
| Przełączenie blokady | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>L</kbd> |

## Wskazówki

- Gdy obiekty się nakładają, przeglądaj je i zmieniaj ich kolejność w panelu [Warstwy i strony](./layers-and-pages).
- Grupowanie, tworzenie komponentów i inne działania opisuje strona [Menu kontekstowe](./context-menu).
