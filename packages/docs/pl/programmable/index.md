---
layout: doc
title: AI i automatyzacja
description: Czat AI, CLI, renderer JSX, serwer MCP i inne narzędzia automatyzacji oparte na silniku edytora Pairdraw.
---

# AI i automatyzacja

Pairdraw pozwala traktować pliki projektowe jak dane. Wszystkie operacje edytora — tworzenie kształtów, ustawianie wypełnień, zarządzanie automatycznym układem i eksport zasobów — są dostępne także z terminala, dla agentów AI i z kodu. Bez instalowania wtyczek, bez kluczy API, bez listy oczekujących.

Interfejs edytora i narzędzia automatyzacji korzystają z tego samego silnika. Każde działanie dostępne w interfejsie można również wykonać ze skryptu.

## Szersza idea

Pairdraw nie ma być wyłącznie aplikacją do projektowania.

Ma być także zestawem narzędzi: czymś, co można osadzić w innych produktach, opakować własnym interfejsem i wykorzystać do budowy procesów edycji dopasowanych do własnej dziedziny.

Dlatego narzędzia automatyzacji są tak ważne. Aplikacja, CLI, narzędzia AI, renderer JSX, serwer MCP i SDK opierają się na tym samym silniku edytora.

## Czat AI

Wbudowany asystent ma dostęp do 142 narzędzi obejmujących pełne możliwości edytora. Opisz zadanie zwykłym językiem, na przykład: „dodaj wszystkim przyciskom cień 16 px”, „utwórz komponent karty z wariantem ciemnym” albo „wyeksportuj wszystkie ramki na tej stronie w skali 2×”.

[Czat AI →](./ai-chat)

## Współpraca

Agenci AI pokazują swoje kursory na obszarze roboczym, a widok podąża za nimi podczas ich pracy. Dokumenty w chmurze na samodzielnie hostowanym serwerze Pairdraw Cloud edytuje na żywo każdy, kto je otworzy, z kursorami, trybem śledzenia i synchronizacją CRDT. Pokoje peer-to-peer są w kompilacjach Pairdraw wyłączone.

[Współpraca →](./collaboration)

## Vue SDK

Twórz edytory oparte na Pairdraw za pomocą tego samego Vue SDK, którego używa aplikacja. SDK udostępnia kontekst edytora, podłączenie obszaru roboczego, stan zaznaczenia, modele poleceń, composables dla paneli właściwości i komponenty bez narzuconego wyglądu.

[Vue SDK →](./sdk/)

## Renderer JSX

Opisuj interfejs za pomocą JSX — tej samej składni, którą modele językowe znają z Reacta. Jedno wywołanie może utworzyć całe drzewo komponentów z ramkami, tekstem, automatycznym układem, wypełnieniami i obwiedniami. Zapis jest zwięzły, deklaratywny i łatwy do porównywania.

W drugą stronę dowolne zaznaczenie można wyeksportować z powrotem do JSX z klasami Tailwind — to przydatne przy przekazywaniu projektu do implementacji albo przy przekazywaniu projektów z powrotem modelowi językowemu.

[Renderer JSX →](./jsx-renderer)

## CLI

Przeglądaj, sprawdzaj lintem, eksportuj i analizuj dokumenty bez uruchamiania edytora. Wyświetlaj strony, szukaj obiektów, wydobywaj tokeny projektu, wykrywaj problemy z układem lub dostępnością i renderuj do PNG — wszystko z terminala, z wyjściem JSON do przetwarzania maszynowego.

CLI łączy się również przez RPC z uruchomioną aplikacją na komputer, więc możesz oskryptować edytor w trakcie pracy z nim: otwierać, zapisywać i przełączać dokumenty, cofać zmiany, zmieniać ustawienia oraz wywoływać dowolne narzędzie MCP.

[Przeglądanie plików](./cli/inspecting) · [Eksport](./cli/exporting) · [Analiza](./cli/analyzing) · [Skrypty](./cli/scripting) · [Sterowanie aplikacją](/programmable/cli/app-control)

## Serwer MCP

Podłącz do Pairdraw Claude Code, Cursor, Windsurf lub dowolnego klienta zgodnego z MCP. Serwer udostępnia 142 narzędzia do odczytu, tworzenia i zmieniania projektów — tych samych, których używa wbudowany czat AI. Działa przez stdio lub HTTP z obsługą sesji.

[Serwer MCP →](/programmable/mcp-server)

## Schemat URL {#url-scheme}

Aplikacja na komputer rejestruje `pairdraw://`, dzięki czemu opublikowana strona — historyjka Storybook, przegląd projektu, README — może prowadzić prosto do warstwy:

```
pairdraw://open?file=web/design/hikyo.pen&node=Button/Large/Default
```

`file` to ścieżka względem repozytorium, kończąca się na `.pen` lub `.fig`; ścieżki bezwzględne oraz segmenty `.` i `..` są odrzucane. `node` jest opcjonalny. Obie wartości są kodowane jako URL — separatory ścieżki mogą pozostać dosłowne, ale dosłowny `+` trzeba wysłać jako `%2B` — a powtórzony klucz przyjmuje ostatnią wartość.

Aplikacja dopasowuje `file` do ścieżek otwartych kart jako całą końcową sekwencję segmentów i aktywuje tę kartę bez ponownego odczytu dokumentu, więc plik, który od otwarcia został przeniesiony lub stał się nieczytelny, nadal pozwala zaznaczyć swoją warstwę. Wygrywa pierwsza otwarta karta, której ścieżka kończy się żądaną ścieżką, co ma znaczenie, gdy dwie kopie repozytorium mają otwarty ten sam plik. Segmenty są porównywane tak jak w systemie plików platformy: bez rozróżniania wielkości liter ASCII w macOS i Windows, dokładnie w Linuksie, więc `Web/Design/hikyo.pen` i `web/design/hikyo.pen` to ten sam plik na Macu i dwa różne w Linuksie. Jeśli żadna otwarta karta nie pasuje, selektor plików jednorazowo prosi o plik; wybrany plik musi kończyć się tą samą ścieżką względną, w przeciwnym razie odnośnik zostaje anulowany. Żadna ścieżka nie jest doklejana do katalogu głównego i nie jest przyznawany dostęp do systemu plików poza tym, co zwróci selektor. Plik, który odnośnik faktycznie otwiera — wybrany — trafia na listę ostatnich plików jak każdy inny otwarty plik; aktywowanie karty już otwartej nie zmienia listy, bo nic nie zostało otwarte.

Przy podanej nazwie obiektu aplikacja zaznacza wszystkie warstwy o dokładnie tej nazwie na bieżącej stronie i przybliża widok do całego zaznaczenia. Gdy bieżąca strona takich warstw nie ma, przełącza się na pierwszą stronę, która je ma, wczytując strony w miarę potrzeby. Nieznana nazwa pokazuje powiadomienie i pozostawia dokument otwarty. Schemat potrafi wyłącznie otworzyć plik i zaznaczyć warstwy.

Wersja internetowa przyjmuje taki sam odnośnik z własnego paska adresu:

```
http://localhost:1420/?file=https://raw.githubusercontent.com/BadryansahBangsawan/pairdraw/master/tests/fixtures/pencil_button.pen&node=Button/Large/Default
```

Tutaj `file` to bezwzględny adres `https:` kończący się na `.pen` lub `.fig` — wersja internetowa nie ma systemu plików, więc ścieżka względna, adres `http:` lub inne rozszerzenie są odrzucane z ostrzeżeniem w konsoli i niczym więcej. Rozszerzenie jest odczytywane ze ścieżki adresu, więc zapytanie w adresie pliku niczego nie zmienia. Fragment jest odcinany przed pobraniem: nigdy nie trafia na serwer, więc `…/hikyo.pen#a` i `…/hikyo.pen#b` otwierają jedną kartę, nie dwie. `node` działa dokładnie jak wyżej: to samo zaznaczanie po dokładnej nazwie i przybliżenie, to samo powiadomienie, gdy żadna warstwa nie ma takiej nazwy. Obie wartości są kodowane jako URL, dosłowny `+` trzeba wysłać jako `%2B`, a powtórzony klucz przyjmuje ostatnią wartość, tak jak na komputerze. Odnośnik jest obsługiwany na każdej trasie, więc `/demo?file=…` działa jak `/?file=…`.

Przeglądarka pobiera plik między domenami, więc host musi to dopuszczać: `raw.githubusercontent.com` wysyła `Access-Control-Allow-Origin: *` i działa. Żądanie nie niesie danych uwierzytelniających i odmawia podążania za przekierowaniami, co chroni przed przekierowaniem odnośnika `https:` na niezaszyfrowany — adres `https://github.com/<owner>/<repo>/raw/...` przekierowuje na `raw.githubusercontent.com`, więc jest odrzucany; podaj bezpośrednio adres hosta raw. `file` i `node` są usuwane z paska adresu przez router zaraz po odczycie — przed pobraniem, a także gdy odnośnik został odrzucony — więc przeładowanie nie otwiera dokumentu ponownie, a skopiowany adres ani późniejsza nawigacja w aplikacji nie niosą danych odnośnika. Dokument z odnośnika jest ograniczony do 64 MiB: treść jest liczona w trakcie strumieniowania, nie na podstawie `Content-Length`, a żądanie jest przerywane w chwili przekroczenia limitu, po czym odnośnik zgłasza, że plik przekracza 64 MiB. Wdrożenie udostępniające aplikację z Content-Security-Policy musi dopuścić host odnośnika w `connect-src`, inaczej pobranie jest blokowane, a odnośnik zgłasza, że nie udało się otworzyć pliku.

W macOS schemat należy do zainstalowanego pakietu aplikacji, więc odnośniki trafiają do zainstalowanej wersji, a nie do procesu `tauri dev`. W Windows i Linuksie odnośnik dociera przez wtyczkę deep-link, także gdy aplikacja jeszcze nie działa: jest kolejkowany przy starcie i obsługiwany, gdy edytor jest gotowy; w Linuksie dołączony wpis pulpitu przekazuje odnośnik przez `%U`.

## Dlaczego otwartość?

Figma jest platformą zamkniętą. Jej serwer MCP oferuje na razie tylko betę, która zapisuje na kanwie przez `use_figma`. Dostęp do przeglądarki przez CDP został zablokowany w wersji 126. Pliki projektowe są przechowywane w zastrzeżonym formacie na cudzych serwerach. Tworzenie wtyczek wymaga osobnego środowiska uruchomieniowego z ograniczonym API.

Pairdraw jest alternatywą: otwarte źródła, licencja MIT, każda operacja dostępna ze skryptu, dane przechowywane lokalnie. Twoje pliki projektowe należą do Ciebie — sprawdzaj je, przekształcaj, przetwarzaj w CI i przekazuj modelowi językowemu. Bez pytania o pozwolenie.
