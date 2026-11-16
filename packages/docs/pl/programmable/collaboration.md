---
title: Współpraca
description: Kursory agentów AI i tryb śledzenia oraz edycja na żywo dokumentów w chmurze przez samodzielnie hostowany serwer Pairdraw Cloud. Pokoje peer-to-peer są w kompilacjach Pairdraw wyłączone.
---

# Współpraca

::: info Pokoje peer-to-peer są w Pairdraw wyłączone
Kompilacje Pairdraw wyłączają pokoje peer-to-peer na żywo (`COLLABORATION_INCLUDED` w `src/constants.ts`). Dla dokumentów lokalnych nie ma okienka udostępniania, dołączania przez link lub identyfikator pokoju, rozmowy głosowej w pokoju ani nazwy do współpracy w Ustawieniach.

Pozostaje to, że agenci AI pokazują swoje kursory na obszarze roboczym i można ich śledzić, a dokumenty w chmurze edytuje na żywo każdy, kto otworzy je przez własny [serwer Pairdraw Cloud](/reference/self-hosting-cloud).
:::

## Agenci na obszarze roboczym

Wbudowany czat AI, czaty ACP i Pi harness oraz każdy połączony klient MCP pojawiają się jako kursory przy warstwach, które czytają lub edytują, a ich obrysowana etykieta zawiera iskrę i kryptonim, na przykład _Fern_. Gdy czat strumieniuje JSX, jego kursor przechodzi przez elementy w miarę ich pojawiania się i je obrysowuje. Agenci rysują kursor i obrys na fioletowo.

Twój awatar pojawia się na górnym pasku tylko wtedy, gdy wyświetla Twoich agentów albo gdy ktoś inny ma otwarty ten sam dokument w chmurze. Awatar pokazuje liczbę agentów uruchomionych przez daną osobę; najedź na niego, aby zobaczyć każdego agenta, jego bieżące działanie i stronę. Kliknij jednego ze swoich agentów, aby zmienić jego nazwę.

**Widok → Kursory wielu użytkowników** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) ukrywa i pokazuje kursory agentów i osób.

## Tryb śledzenia

Twoi agenci, czyli czat AI i klienci MCP, tacy jak Claude Code czy Cursor, są śledzeni automatycznie podczas pracy, więc to, co edytują, pozostaje w widoku. Wyłączysz to przyciskiem lokalizowania w nagłówku czatu. Jeśli przestaniesz śledzić agenta w trakcie jego pracy, nie będzie śledzony do jej końca, a przy następnym uruchomieniu znów będzie.

Kliknij **Obserwuj** przy agencie na liście jego awatara, aby mieć w widoku stronę i warstwy, które edytuje; śledzenie trwa między jego odpowiedziami i kończy się, gdy agent odejdzie. W dokumencie w chmurze kliknij awatar osoby, aby śledzić jej widok: Twój obszar roboczy przesuwa się i zmienia powiększenie, by odpowiadać jej widokowi, a ramka w jej kolorze z paskiem „Obserwujesz: …” pokazuje, kogo śledzisz. Aby przestać, kliknij awatar ponownie, naciśnij <kbd>Esc</kbd> albo sam kliknij, przewiń, zmień powiększenie lub przełącz stronę.

W dokumencie w chmurze inni widzą tylko nazwę, rodzaj, model, stan, stronę, położenie i edytowane warstwy agenta, nigdy prompty ani odpowiedzi.

## Dokumenty w chmurze

Otwarcie dokumentu w chmurze dołącza do jego pokoju na przekaźniku serwera, więc każdy, kto ma go otwartego, widzi na bieżąco zmiany, kursory, zaznaczenia i komentarze pozostałych osób. **Udostępnij** w dokumencie w chmurze otwiera okno udostępniania, w którym serwer decyduje, kto może go otworzyć: linki do podglądu, komentowania lub edycji, zaproszenia oraz linki do migawki jednej zapisanej wersji. Sposób pracy opisuje strona [Pairdraw Cloud](/user-guide/pairdraw-cloud), a przekaźnik strona [Architektura Cloud](/development/cloud#live-collaboration).

## Jak działa synchronizacja

Stan dokumentu korzysta z CRDT (bezkonfliktowego replikowanego typu danych), więc równoczesne zmiany łączą się automatycznie, bez konfliktów.

Przenoszenie i zmiana kolejności warstw również się scalają. Każda warstwa pamięta każdego rodzica, do którego została przeniesiona, i swoje miejsce wśród rodzeństwa, a każdy uczestnik wyznacza z tej historii to samo drzewo warstw ([CRDT drzewa Evana Wallace’a](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Przeniesienia, zmiany kolejności i nowe warstwy od różnych osób są stosowane; jeśli dwie osoby jednocześnie przeniosą tę samą warstwę, u wszystkich wygrywa to samo przeniesienie. Gdy równoczesne przeniesienia umieściłyby dwie warstwy jedna w drugiej, późniejsze przeniesienie jest cofane, a warstwa, której nowy rodzic został w międzyczasie usunięty, wraca na swoje miejsce.

Wszyscy, którzy wspólnie edytują dokument, potrzebują wersji Pairdraw, która zapisuje drzewo warstw w ten sam sposób; wersje zapisujące je inaczej nie widzą nawzajem swoich zmian.

## Pokoje peer-to-peer (poza kompilacjami Pairdraw)

Kod pokoi pozostaje w `src/app/collab/**`, ponieważ działają na nim dokumenty w chmurze i obecność agentów. Kompilacja z `COLLABORATION_INCLUDED` ustawionym na `true` przywraca pokoje peer-to-peer: Udostępnij umieszcza dokument lokalny w pokoju, którego link (`/rooms/<room-id>` w przeglądarce, `pairdraw://join?room=<room-id>` w aplikacji na komputer) może otworzyć każdy, uczestnicy łączą się bezpośrednio przez WebRTC za pomocą Trystero, a każde urządzenie przechowuje własną kopię pokoju. Pairdraw nie dostarcza takich kompilacji i ich nie wspiera.
