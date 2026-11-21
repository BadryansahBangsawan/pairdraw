# Funkcje

## Pliki Figma

Pairdraw otwiera i zapisuje natywne pliki `.fig` bez wcześniejszej konwersji. Import i eksport korzystają z tego samego binarnego kodeka Kiwi co Figma: 605 definicji schematu i około 590 pól dla każdego obiektu. Zapisz: <kbd>⌘</kbd><kbd>S</kbd>; Zapisz jako: <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>.

**Kopiowanie między Figmą a Pairdraw:** zaznacz obiekty w Figmie, naciśnij <kbd>⌘</kbd><kbd>C</kbd>, przejdź do Pairdraw i naciśnij <kbd>⌘</kbd><kbd>V</kbd>. Zachowywane są wypełnienia, obrysy, automatyczny układ, tekst, efekty, promienie narożników i sieci wektorowe. Wymiana działa w obie strony.

## Rysowanie i edycja

- **Figury:** prostokąt (<kbd>R</kbd>), elipsa (<kbd>O</kbd>), linia (<kbd>L</kbd>), wielokąt i gwiazda.
- **Pióro:** sieci wektorowe (a nie proste ścieżki), krzywe Béziera i uchwyty stycznych.
- **Ołówek** (<kbd>⇧</kbd><kbd>P</kbd>): odręczne pociągnięcia wygładzane do edytowalnych krzywych.
- **Tekst:** edycja bezpośrednio na obszarze roboczym i obsługa IME; dwukrotne kliknięcie włącza tryb edycji.
- **Formatowanie tekstu:** pogrubienie (<kbd>⌘</kbd><kbd>B</kbd>), kursywa (<kbd>⌘</kbd><kbd>I</kbd>), podkreślenie (<kbd>⌘</kbd><kbd>U</kbd>) i przekreślenie dla pojedynczych znaków.
- **Automatyczny układ:** Flexbox i CSS Grid przez Yoga WASM; kierunek, odstępy, dopełnienie, wyrównanie w osi głównej i poprzecznej, rozmiary elementów podrzędnych i ścieżki siatki. Przełącznik: <kbd>⇧</kbd><kbd>A</kbd>.
- **Komponenty:** tworzenie (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd>), zestawy komponentów, instancje z nadpisaniami, sloty oraz synchronizacja na żywo.
- **Zachowania i podgląd:** komponenty mogą działać jak kontrolki Reka UI (przełącznik, suwak, karty, pole tekstowe, akordeon…), a <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> pozwala wypróbować je na żywo nad obszarem roboczym ([Komponenty](/pl/user-guide/components#behaviours-and-preview)).
- **Warstwy skryptów:** zawartość warstwy rysuje program JavaScript zapisany w dokumencie. Kontrolki `@input` można wiązać ze zmiennymi; zmiana kodu, danych wejściowych lub rozmiaru uruchamia ponownie skrypt, a wynik jednym krokiem zamienia się w zwykłe warstwy ([Warstwy skryptów](/user-guide/script-layers)).
- **Prototypy:** interakcje po kliknięciu, najechaniu, naciśnięciu, wejściu lub wyjściu kursora albo po opóźnieniu prowadzą do ramki, otwierają lub zamykają nakładkę, wracają, zmieniają wariant komponentu albo przewijają do warstwy, a ramki mogą się przewijać; można je odtwarzać na obszarze roboczym z natychmiastowym przejściem, przenikaniem lub inteligentną animacją ([Odtwarzanie prototypu](/user-guide/playing-a-prototype)).
- **Zmienne:** tokeny projektu z kolekcjami, trybami (Light/Dark), typami Color, Float, String i Boolean oraz powiązaniami.
- **Sekcje:** kontenery porządkujące, które automatycznie przejmują obiekty i mają etykiety z tytułem.

## Układ edytora

Edytor otwiera się na samym obszarze roboczym. Narzędzia stoją przy lewej krawędzi obszaru roboczego, nad nimi przełącznik panelu warstw, a powiększenie znajduje się w prawym dolnym rogu. Panel właściwości pojawia się po zaznaczeniu warstwy i znika razem z zaznaczeniem; panel otwarty przełącznikiem pozostaje otwarty. Gdy czat AI jest zamknięty, pole u dołu obszaru roboczego wysyła do niego to, co napiszesz. Aplikacja startuje w ciemnym motywie; **Ustawienia → Ogólne → Motyw** oferuje też Jasny i Automatycznie.

- **Znajdź warstwy:** <kbd>⌘</kbd><kbd>F</kbd> wyszukuje warstwy wyświetlanej strony po nazwie, zaznacza wybraną i przewija do niej widok.
- **Dodatki:** przycisk z prezentem na górnym pasku zbiera materiały na dobry początek: style do przypięcia do czatu AI, systemy projektowe do włączenia, skrypty umieszczane jako warstwy kodu i gotowe shadery.

## Panel właściwości

Zawartość kart „Design” i „Kod” zależy od zaznaczenia; obok nich jest karta „Sprawdź”.

- **Wygląd:** przezroczystość, wspólny lub osobny promień narożników i widoczność.
- **Wypełnienie:** kolor jednolity, gradient (liniowy, radialny, kątowy, diamentowy, siatkowy) oraz obraz.
- **Obrys:** kolor, grubość, wyrównanie (wewnątrz, środek, na zewnątrz), osobna grubość boków, zakończenia, łączenia i kreskowanie.
- **Efekty:** cień zewnętrzny i wewnętrzny, rozmycie warstwy, tła i pierwszego planu.
- **Typografia:** wybór czcionki z wyszukiwaniem i wirtualnym przewijaniem, odmiana, rozmiar, wyrównanie i przyciski stylu.
- **Układ:** ustawienia automatycznego układu, gdy jest włączony.
- **Eksport:** skala, format (PNG, JPG, WEBP, SVG, PDF, HTML), jakość i podgląd na żywo.
- **Kod:** Design JSX, HTML oraz komponenty Vue i React dla zaznaczenia, ze stylami CSS lub Tailwind; dwukierunkowa edycja Design JSX na żywo aktualizuje kod wraz ze zmianami warstw. Element pod kursorem obrysowuje swoją warstwę na obszarze roboczym, a problemy projektowe są podkreślone przy właściwości, która je powoduje.
- **Sprawdź:** lint projektu na żywo dla strony lub zaznaczenia: niski kontrast, małe obszary dotykowe, niepowiązane kolory, odstępy spoza skali. Sprawdzanie działa, gdy karta jest otwarta, a zmienną można powiązać jednym kliknięciem ([Sprawdzanie projektów](/user-guide/checking-designs)).

## Renderowanie

Pairdraw używa Skia przez CanvasKit WASM — tego samego silnika graficznego co Figma:

- gradienty liniowe, radialne, kątowe i diamentowe;
- wypełnienia obrazami z różnymi trybami skalowania i regulacjami (ekspozycja, kontrast, nasycenie, temperatura, odcień, światła, cienie);
- efekty z pamięcią podręczną dla każdego obiektu;
- łuki, częściowe elipsy i pierścienie;
- pomijanie obiektów poza widokiem i ponowne użycie pędzli;
- prowadnice przyciągania z uwzględnieniem obrotu;
- linijki z zakresem zaznaczenia;
- podświetlenie zgodne z rzeczywistą geometrią.

## Cofanie i ponawianie

Każdą operację można cofnąć: tworzenie, usuwanie, przesuwanie, zmianę rozmiaru, właściwości i rodzica, zmiany układu oraz operacje na zmiennych. Mechanizm opiera się na poleceniach odwrotnych. Skróty: <kbd>⌘</kbd><kbd>Z</kbd> i <kbd>⇧</kbd><kbd>⌘</kbd><kbd>Z</kbd>.

## Dokumenty wielostronicowe

Strony można dodawać, usuwać i przemianowywać; każda zachowuje własne położenie i skalę widoku. Dwukrotne kliknięcie nazwy pozwala zmienić ją w miejscu.

## Karty z wieloma plikami

Wiele dokumentów można otworzyć w kartach. <kbd>⌘</kbd><kbd>T</kbd> otwiera nową kartę, <kbd>⌘</kbd><kbd>W</kbd> ją zamyka, a <kbd>⌘</kbd><kbd>O</kbd> otwiera plik.

## Eksport

- **Obrazy:** PNG, JPG i WEBP w skali od 0,5× do 4× — z panelu, menu kontekstowego lub skrótem <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd>.
- **SVG:** figury, tekst z zakresami stylów, gradienty, efekty i tryby mieszania.
- **PDF:** jedna warstwa na stronę albo **Plik → Eksportuj ramki do PDF…** dla ramek strony.
- **HTML:** strona lub fragment ze zwykłym CSS albo klasami Tailwind.
- **Tailwind JSX:** HTML z klasami Tailwind v4, gotowy dla React lub Vue.
- **Kopiuj jako:** tekst, SVG, PNG (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd>) albo JSX przez menu kontekstowe.

CLI:

```sh
pairdraw export design.fig -f jsx --style tailwind
```

## Czat AI

Naciśnij <kbd>⌘</kbd><kbd>J</kbd>, aby otworzyć asystenta AI we własnej kolumnie obok panelu właściwości, albo napisz w polu u dołu obszaru roboczego lub na ekranie startowym. Bez skonfigurowanego modelu czat korzysta z agenta programistycznego zainstalowanego już na tym komputerze: Claude Code, Codex lub Gemini CLI. 142 narzędzia tworzą figury, zmienia style i układ, pracuje z komponentami i zmiennymi, wykonuje operacje logiczne, analizuje tokeny projektu i eksportuje zasoby. Można podłączyć Anthropic, OpenAI, Google AI, OpenRouter, dowolny zgodny punkt końcowy albo AI oferowane przez Twój serwer [Pairdraw Cloud](/user-guide/pairdraw-cloud#ai-on-cloud). Każdy dostawca, model i agent ma logo swojego twórcy.

Wywołania narzędzi pojawiają się na zwijanej osi czasu. Kontrola wizualna: asystent renderuje swoją pracę i porównuje ją z poleceniem. Wszystkie zmiany AI można cofnąć.

Możesz patrzeć, jak agent rysuje: każda dodana warstwa rysuje się po kolei, ramki, w których pracuje, migoczą, a gdy skończy, powiadomienie podaje, co dodał i zmienił. **Animuj zmiany AI** w Ustawieniach wyłącza to ([Obserwowanie, jak asystent rysuje](/pl/programmable/ai-chat#watching-the-assistant-draw)).

Konfigurację i szczegóły dostawców opisuje strona [Czat AI](/pl/programmable/ai-chat).

## Wbudowana przeglądarka

Strony `http` i `https` otwierają się we własnym oknie aplikacji komputerowej, które nie dzieli niczego z edytorem, i można je przenieść na obszar roboczy: zaimportować całą stronę lub wybrany element jako warstwy albo umieścić zrzut widoku, strony lub elementu. Czat może odczytać stronę, oznaczyć element w odpowiedzi i klikać, wpisywać tekst, naciskać klawisze, przewijać lub czekać na stronie, pytając najpierw o zgodę, gdy ustawienia tego wymagają.

Na istniejącej tablicy ta sama przeglądarka staje się badaniem: czat cytuje stronę w karteczce, która zachowuje adres, tytuł, cytat i czas odczytu ([Badanie na tablicy](/user-guide/research)). Pairdraw nie tworzy nowych tablic.

## Serwer MCP

Claude Code, Cursor, Windsurf i inni klienci MCP mogą odczytywać i zmieniać pliki `.fig` bez interfejsu lub dokument otwarty w działającym edytorze. Dostępne są 142 narzędzia oraz dwa transporty: stdio i HTTP.

```sh
npm install -g @pairdraw/mcp
```

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

Pełną listę narzędzi zawiera [dokumentacja narzędzi MCP](/programmable/mcp-server).

## CLI

Pliki `.fig` można przeglądać, eksportować i analizować z terminala:

```sh
pairdraw tree design.fig              # Drzewo obiektów
pairdraw find design.fig --type TEXT  # Wyszukiwanie
pairdraw export design.fig -f png     # Eksport
pairdraw analyze colors design.fig    # Analiza kolorów
pairdraw analyze clusters design.fig  # Powtarzające się struktury
pairdraw eval design.fig -c "..."     # Figma Plugin API
```

Gdy aplikacja na komputer działa, pomiń plik, aby sterować otwartym edytorem przez RPC:

```sh
pairdraw tree                     # Otwarty dokument
pairdraw export -f png            # Zrzut obszaru roboczego
```

Wszystkie polecenia obsługują `--json`. Instalacja: `npm install -g @pairdraw/cli` albo `bun add -g @pairdraw/cli`.

## Współpraca

Pairdraw nie ma pokoi peer-to-peer na żywo: dokument lokalny nie ma odnośnika Udostępnij, nie można dołączyć przez identyfikator pokoju i nie ma rozmów głosowych. Dokumenty na serwerze [Pairdraw Cloud](/user-guide/pairdraw-cloud) są udostępniane przez ten serwer, a każdy, kto taki dokument otworzy, edytuje go na żywo ([Współpraca](/pl/programmable/collaboration)).

- Kursory na żywo z kolorowymi strzałkami i etykietami z nazwą, dla osób w dokumencie w chmurze i dla agentów AI.
- Awatary obecności; Twój własny pojawia się na górnym pasku tylko wtedy, gdy wymienia Twoich agentów AI albo gdy ktoś inny ma otwarty dokument w chmurze.
- Tryb śledzenia: kliknij osobę lub agenta, aby podążać za jej widokiem.
- **Widok → Kursory wielu użytkowników** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) ukrywa i pokazuje kursory.

## Wersja komputerowa i internetowa

**Komputer:** Tauri v2, z instalatorem dla macOS o rozmiarze około 20 MB. Gotowe wersje są wydawane dla macOS na Apple Silicon; Windows, Linux i komputery Mac z procesorem Intel buduje się ze źródeł. Menu systemowe, praca bez sieci i automatyczny zapis.

**Internet:** działa w przeglądarce z własnej kompilacji (`bun run dev` albo samodzielnie hostowane wdrożenie) lub z serwera Pairdraw Cloud; wersji hostowanej nie ma. Na urządzeniach mobilnych można ją zainstalować jako PWA z interfejsem dostosowanym do dotyku.

**VS Code:** osobny edytor dokumentów `.fig` i `.pen`, który uruchamia edytor internetowy w webview i zapisuje to, co on pokazuje. Nie jest publikowany w żadnym sklepie, więc buduje się go z repozytorium ([Rozszerzenie VS Code](/programmable/vscode)).

## Wtyczki

W **Ustawienia → Aplikacja → Wtyczki** można instalować manifesty wtyczek, a polecenie wtyczki uruchamia się z palety poleceń; działa ono na otwartym dokumencie po zapytaniu, co może robić. Jednocześnie działa jedna wtyczka, a dostęp do sieci jest odrzucany ([Wtyczki](/user-guide/plugins)).

## Zastępcze ładowanie Google Fonts

Jeśli czcionka nie jest dostępna lokalnie, Pairdraw automatycznie pobiera ją z Google Fonts. Przy otwieraniu plików `.fig` z nieznanymi czcionkami ręczna instalacja nie jest potrzebna.
