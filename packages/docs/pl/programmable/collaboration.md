---
title: Współpraca
description: Śledzenie agentów AI na obszarze roboczym i wspólna edycja dokumentów w chmurze.
---

# Współpraca

Pokoje na żywo nie są częścią Pairdraw: dla dokumentów lokalnych nie ma okienka udostępniania, dołączania przez odnośnik lub identyfikator pokoju, rozmowy głosowej w pokoju ani nazwy do współpracy w ustawieniach. Dokumenty edytuje się wspólnie przez [Pairdraw Cloud](/user-guide/pairdraw-cloud#edit-together) na serwerze chmury Twojego zespołu. Warstwa obecności pozostaje, ponieważ to przez nią agenci AI pokazują swoje kursory.

## Agenci na obszarze roboczym

Wbudowany czat AI, czaty ACP i Pi harness oraz każdy połączony klient MCP pojawiają się jako kursory przy warstwach, które czytają lub edytują, a ich obrysowana etykieta zawiera iskrę i kryptonim, na przykład *Fern*. Gdy czat strumieniuje JSX, jego kursor przechodzi przez elementy w miarę ich pojawiania się i je obrysowuje. Agenci rysują kursor i obrys na fioletowo.

**Widok → Kursory wielu użytkowników** ukrywa i pokazuje kursory agentów oraz innych osób na obszarze roboczym.

## Śledzenie agentów

Twoi agenci, czat AI i klienci MCP, tacy jak Claude Code czy Cursor, są śledzeni automatycznie podczas pracy, więc to, co edytują, pozostaje w widoku. Wyłączysz to przyciskiem **Śledź agentów podczas pracy** (celownik) w nagłówku czatu. Jeśli przestaniesz śledzić agenta w trakcie jego pracy, nie będzie śledzony do jej końca, a przy następnym uruchomieniu znów będzie.

Twój awatar pojawia się na górnym pasku tylko wtedy, gdy wyświetla Twoich agentów. Najedź na niego, aby zobaczyć każdego agenta, jego bieżące działanie i stronę, a następnie kliknij **Obserwuj** przy agencie, aby mieć w widoku stronę i warstwy, które edytuje; śledzenie trwa między jego odpowiedziami i kończy się, gdy agent odejdzie. Kliknij jednego ze swoich agentów, aby zmienić jego nazwę.

## W dokumentach w chmurze

Osoby, które mają otwarty ten sam dokument w chmurze, widzą nawzajem swoje kursory, zaznaczenia i agentów. Awatar pokazuje liczbę agentów uruchomionych przez daną osobę, a pasek „Obserwujesz: …” podaje osobę, która uruchomiła agenta, więc widać, czyj to agent. Udostępniane są tylko nazwa, rodzaj, model, stan, strona, położenie i edytowane warstwy agenta, nigdy prompty ani odpowiedzi.

Kliknij awatar osoby na górnym pasku, aby śledzić jej widok. Położenie i skala obszaru roboczego będą odpowiadać jej widokowi, a ramka w jej kolorze z paskiem „Obserwujesz: …” pokazuje, kogo śledzisz. Aby przestać, kliknij awatar ponownie, naciśnij <kbd>Esc</kbd> albo sam kliknij, przewiń, zmień powiększenie lub przełącz stronę.

## Jak to działa

Dokument w chmurze synchronizuje swój stan przez Yjs CRDT za pośrednictwem serwera chmury, a równoczesne zmiany są łączone automatycznie.

Przenoszenie i zmiana kolejności warstw również się scalają. Każda warstwa pamięta każdego rodzica, do którego została przeniesiona, i swoje miejsce wśród rodzeństwa, a każdy uczestnik wyznacza z tej historii to samo drzewo warstw ([CRDT drzewa Evana Wallace’a](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Przeniesienia, zmiany kolejności i nowe warstwy od różnych osób są stosowane; jeśli dwie osoby jednocześnie przeniosą tę samą warstwę, u wszystkich wygrywa to samo przeniesienie. Gdy równoczesne przeniesienia umieściłyby dwie warstwy jedna w drugiej, późniejsze przeniesienie jest cofane, a warstwa, której nowy rodzic został w międzyczasie usunięty, wraca na swoje miejsce.

Wszyscy, którzy wspólnie edytują dokument, potrzebują wersji Pairdraw, która zapisuje drzewo warstw w ten sam sposób.
