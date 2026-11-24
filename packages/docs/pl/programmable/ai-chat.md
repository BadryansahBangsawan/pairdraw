---
title: Czat AI
description: Wbudowany asystent AI z 142 narzędziami do tworzenia i zmieniania projektów.
---

# Czat AI

Naciśnij <kbd>⌘</kbd><kbd>J</kbd> (<kbd>Ctrl</kbd> + <kbd>J</kbd>) albo kliknij przycisk z iskrami wśród działań dokumentu na górnym pasku, aby otworzyć asystenta AI we własnej kolumnie obok panelu Design. Opisz, czego potrzebujesz: asystent tworzy kształty, ustawia style, zarządza układem, pracuje z komponentami i analizuje projekt.

## Zacznij od promptu

Ekran startowy pyta **Co chcesz zaprojektować?** nad polem wyszukiwania. Opisz ekran, komponent lub stronę i naciśnij <kbd>Enter</kbd> (<kbd>Shift</kbd> + <kbd>Enter</kbd> zaczyna nowy wiersz): Pairdraw otwiera nowy projekt tam, gdzie tworzy go ekran startowy, czyli w obszarze roboczym Cloud lub zasobniku pamięci, jeśli jest wybrany, otwiera jego czat i wysyła prompt. Gdy żaden model nie jest jeszcze skonfigurowany, prompt czeka w czacie nowego projektu, a Pairdraw szuka agenta programistycznego na Twoim komputerze (zobacz [Konfiguracja](#setup)) i wysyła go po połączeniu agenta. Jeśli żadnego nie znajdzie, najpierw otwiera się konfiguracja z przewodnikiem, a prompt zostaje wysłany po jej zakończeniu; zamknięcie konfiguracji zostawia prompt na ekranie startowym.

W wersji komputerowej pusta strona projektu oferuje ten sam prompt nad obszarem roboczym. Wysyła go do czatu tego dokumentu i znika, gdy na stronie pojawi się warstwa albo agent zacznie pracę; obszar roboczy wokół niego działa jak zwykle. Zamknij go, aby ukryć go w tym dokumencie, albo wyłącz **Prompt on empty pages** w **Ustawienia → Modele → Czat**. Tablice i dokumenty tylko do odczytu go nie pokazują.

Oba prompty pokazują przykładowe chipy: **Strona docelowa**, **Ekran logowania**, **Panel analityczny** i **Cennik**. Wybranie jednego wypełnia prompt pomysłem na start i ustawia w nim fokus, aby można go było poprawić przed wysłaniem; nic nie zostaje wysłane, dopóki nie naciśniesz <kbd>Enter</kbd>.

## Wysyłanie pracy z obszaru roboczego

- **Uruchom karteczkę jako polecenie** w [menu kontekstowym](/pl/user-guide/context-menu#run-sticky-as-prompt) obszaru roboczego wysyła tekst zaznaczonych karteczek z odwołaniem do każdej z nich.
- **Zastosuj z AI** w menu wątku komentarzy prosi asystenta o wprowadzenie uwag z tego wątku, odpowiedź z opisem zmian i rozwiązanie wątku. Prompt cytuje komentarz i odpowiedzi oraz łączy warstwę, do której przypięty jest wątek. **Zastosuj otwarte komentarze z AI** na liście komentarzy robi to samo dla każdego pokazanego otwartego wątku; rozwiązane wątki są pomijane.

Oba polecenia wysyłają prompt do czatu dokumentu, są dostępne tylko w dokumentach, które możesz edytować, i gdy żaden model nie jest skonfigurowany, najpierw konfigurują go tak samo jak prompt na ekranie startowym. Warstwy, do których prowadzi prompt, trafiają do niego jako odwołania, tak jak przy wspomnieniu ich w polu czatu.

## Konfiguracja {#setup}

Przy pierwszym uruchomieniu Pairdraw nie otwiera okna konfiguracji. Dopóki żaden model nie jest skonfigurowany, szuka [agenta programistycznego](/programmable/coding-agents) zainstalowanego już na tym komputerze: najpierw Claude Code, potem Codex, potem Gemini CLI. Agent zainstalowany i zalogowany od razu staje się agentem projektowym, a czat pokazuje komunikat **Używasz Claude Code z tego komputera.** z przyciskiem **Zmień**, aby wybrać inny model. Agent, który nie informuje, czy jest zalogowany, na przykład Gemini CLI, również zostaje użyty; jeśli okaże się niezalogowany, czat pokazuje polecenie logowania. Agent, który wymaga jeszcze zalogowania albo zainstalowania programu ACP lub serwera MCP, dostaje w kolumnie czatu jeden przycisk; bez jego naciśnięcia nic nie jest logowane ani instalowane. Model skonfigurowany przez Ciebie nigdy nie zostaje zastąpiony.

Gdy Pairdraw nie znajdzie agenta albo agenci nie mogą tu działać, jak w aplikacji internetowej bez [aplikacji towarzyszącej](/programmable/browser-agents), wysłanie promptu otwiera konfigurację z przewodnikiem. Pyta ona, w czym ma pomagać AI i z czego już korzystasz: z agenta programistycznego, takiego jak Claude Code, Codex, Gemini CLI lub Pi w aplikacji na komputer, z konta API albo z serwera lokalnego lub firmowego. Łączy ten dostęp i przypisuje go do ról **Agent projektowy** i **Wizja**, zachowując wszystko, co skonfigurowano ręcznie. W przypadku OpenRouter możesz się zalogować zamiast wklejać klucz API. Konfigurację uruchomisz w dowolnej chwili w **Ustawienia → Modele → Uruchom konfigurację z przewodnikiem**. Aby skonfigurować modele ręcznie:

1. Otwórz kolumnę czatu AI (<kbd>⌘</kbd><kbd>J</kbd>).
2. Kliknij ikonę ustawień.
3. Dodaj model i skonfiguruj dostawcę, identyfikator modelu, dane uwierzytelniające oraz możliwości.
4. Zapisz model i przypisz go do roli **Agent projektowy**.

Możesz utworzyć kilka modeli wielokrotnego użytku i osobno przypisać je do pracy projektowej, przeglądów, szybkich zadań i obsługi obrazów. Modele korzystające z tego samego połączenia dostawcy używają wspólnych zapisanych danych uwierzytelniających.

Pole wiadomości rośnie wraz z wielowierszowymi promptami. Wpisz `@`, aby wspomnieć warstwę, stronę lub umiejętność, albo użyj przycisku zaznaczenia, aby wspomnieć zaznaczone warstwy; `/` na początku wiadomości uruchamia umiejętność albo jedno z poleceń agenta ACP. Wzmianki wyświetlają się jako chipy, także w odpowiedziach, w których asystent wymienia zmienione warstwy; kliknięcie chipu pokazuje warstwę na obszarze roboczym. Wiadomości asystenta pokazują rozumowanie dostawcy w zwijanych sekcjach i mają działanie kopiowania każdej odpowiedzi. Załączniki graficzne pozostają dostępne jako odniesienia wizualne, gdy skonfigurowano model z rolą Wizja. Przesyłane strumieniowo odpowiedzi korzystają z zabezpieczonego renderera Markdown z blokami kodu podświetlanymi przez Shiki; niebezpieczne protokoły linków i osadzone obrazy w adresach data są blokowane.

## Sesje agentów

Agent programistyczny prowadzi swoje sesje z modelem, poziomem rozumowania i trybem. Pole wiadomości oferuje model, poziom rozumowania i tryb, które Claude Code, Codex i Gemini CLI udostępniają dla swoich sesji. Wybór działa natychmiast w bieżącej sesji oraz w późniejszych sesjach z tym agentem, z wyjątkiem trybów pomijających pytania o uprawnienia, które obowiązują tylko przez jedną sesję.

W wersji komputerowej każdy czat może dać swojemu agentowi programistycznemu folder projektu do pracy, wybrany w nagłówku czatu i najpierw potwierdzony. Sesje w nim zaczynają się w domyślnym trybie agenta, a przenoszone są tylko wybrany model i poziom rozumowania.

## Limit kroków

W **Ustawienia → Modele → Czat** ustaw **Maksymalna liczba kroków na wiadomość** na liczbę całkowitą od 1 do 1000. Domyślnie jest to 50. Naciśnij Enter lub opuść pole, aby zapisać poprawną wartość; niepoprawne wpisy nie zastępują zapisanej preferencji. Wyższe limity pozwalają na dłuższe zadania oparte na narzędziach, ale mogą zwiększyć opóźnienie i koszt u dostawcy.

Wbudowane AI odczytuje ten limit w chwili rozpoczęcia każdej wiadomości. Zatrzymanie, ostrzeżenia o pozostałych krokach i działanie **Kontynuuj** korzystają z tego samego budżetu. Zmiana limitu nie przerywa trwającego żądania; nowy limit obowiązuje od następnej wiadomości lub kontynuacji. Krok to jedna iteracja modelu i może obejmować kilka wywołań narzędzi. Agenci ACP i Pi zarządzają własnymi limitami.

## Dostęp do narzędzi

Otwórz **Ustawienia → Dostęp do narzędzi**, aby wybrać, z których narzędzi mogą korzystać bezpośrednie połączenia z modelami AI. Szukaj po nazwie lub opisie, rozwijaj grupy narzędzi tylko do odczytu lub ze skutkami ubocznymi i przełączaj pojedyncze narzędzia albo całą grupę. Przełącznik grupy dotyczy wszystkich narzędzi w tej grupie, nie tylko wyników wyszukiwania. **Przywróć domyślne** przywraca domyślny zestaw narzędzi: podstawowe narzędzia edycji i inspekcji, narzędzia bibliotek (`get_components`, `list_libraries`, `insert_library_component`), komentarze, zmienne, `lint` i `lint_fix`, `export_image`, `list_pages` oraz `create_page`. Narzędzia rozszerzone, takie jak `create_component`, można włączać pojedynczo.

Preferencje są zapisywane lokalnie i obowiązują od następnej wiadomości, także w istniejącej rozmowie. Nie zmieniają żądania, które już trwa. Włączenie wielu narzędzi zwiększa liczbę schematów wysyłanych do modelu.

Segment **Local MCP** ma niezależne ustawienia dla klientów połączonych z serwerem MCP Pairdraw, w tym agentów ACP i Pi. Po zmianie tych ustawień uruchom ponownie serwer i ponownie połącz klientów stdio. Zdalne połączenia MCP, dostęp WebMCP oraz uprawnienia Pi do powłoki i systemu plików pozostają oddzielne.

Przełączniki narzędzi decydują o tym, które narzędzia są oferowane, a nie o tym, jakie operacje mogą wykonywać skrypty. Włączone `eval` lub inne narzędzie zdolne do uruchamiania skryptów może wykonywać operacje projektowe, których dedykowane narzędzia są wyłączone; te przełączniki nie są piaskownicą.

## Umiejętności

Umiejętności to foldery z plikiem `SKILL.md` w formacie [Agent Skills](https://agentskills.io/specification): instrukcje do określonego rodzaju pracy z opcjonalnymi plikami pomocniczymi. Wbudowane AI widzi nazwę i opis każdej włączonej umiejętności i wczytuje jej instrukcje, gdy prośba do niej pasuje. Może czytać pliki umiejętności, ale skrypty z umiejętności nie są uruchamiane.

Otwórz **Ustawienia → Umiejętności**, aby zobaczyć, skąd pochodzą umiejętności:

- **Przesłane**: prześlij ZIP folderu umiejętności albo pojedynczy plik `SKILL.md`. Przesłane umiejętności zostają w Pairdraw i działają także w przeglądarce.
- **Obok tego dokumentu** (wersja komputerowa): foldery `.agents/skills` i `.claude/skills` od folderu otwartego dokumentu aż do jego repozytorium. Pozostają wyłączone, dopóki nie wybierzesz **Zaufaj folderowi**, ponieważ umiejętność daje AI instrukcje, których ono przestrzega.
- **Wbudowane**: umiejętności dostarczane z Pairdraw. Przewodniki po stronach docelowych, aplikacjach mobilnych, aplikacjach webowych, pulpitach, slajdach, systemach projektowych i Tailwind CSS v4 oraz umiejętności do pracy z istniejącym projektem: `layout`, `restyle`, `dark-mode` i `design-review`. Są włączone od początku, działają także w przeglądarce i ustępują Twojej umiejętności o tej samej nazwie.
- **Wspólne umiejętności agentów** i **Umiejętności Claude Code** (wersja komputerowa): `~/.agents/skills` i `~/.claude/skills`, gdzie inni agenci programistyczni instalują umiejętności. Większość z nich to procesy programistyczne, więc te foldery są początkowo wyłączone; krok przeglądu w konfiguracji AI wymienia ich umiejętności, abyś mógł wybrać te, które pomagają w projektowaniu.

Przesłane umiejętności są włączone od razu po dodaniu, a każdy folder i każdą umiejętność można włączyć lub wyłączyć. Strona pokazuje je tak, jak Dostęp do narzędzi pokazuje narzędzia: każde źródło jest grupą z własnym przełącznikiem, a każda umiejętność ma przełącznik obok siebie. Otwórz umiejętność, aby przeczytać jej instrukcje, zobaczyć pliki lub sprawdzić ostrzeżenia o odstępstwach od specyfikacji. Gdy dwie umiejętności mają tę samą nazwę, używana jest pierwsza w tej kolejności.

Aby samodzielnie uruchomić umiejętność, wpisz `/` na początku wiadomości i wybierz ją albo wybierz ją w **Wybierz umiejętność**, przycisku z książką pod polem wiadomości; oba sposoby zaczynają wiadomość od `/skill:name` i zastępują wcześniej wybraną umiejętność. Pi otrzymuje włączone umiejętności jako własne. Agenci ACP, tacy jak Claude Code i Codex, wczytują własne umiejętności.

## Zapisane rozmowy

**Historia czatów** pozwala wrócić do zapisanego czatu, rozpocząć **Nowy czat** albo zmienić nazwę lub usunąć rozmowę. Historia i podglądy załączników są przechowywane lokalnie; **Wszystkie czaty** pozwala przeglądać zapisy rozmów z innych dokumentów.

Rozmowa należąca do innego dokumentu jest tylko do odczytu, dopóki nie otworzysz tego dokumentu. Zapisany przebieg rozmowy z agentem nie gwarantuje, że jego zewnętrzną sesję da się wznowić: gdy wznowienie jest niedostępne, rozpocznij nowy czat. Lokalna historia nie jest synchronizacją w chmurze ani kopią zapasową.

W ustawieniach Czatu obok przeglądu modeli wybierz, czy rozumowanie ma być **Domyślnie zwinięte**, **Rozwijaj podczas rozumowania**, czy **Domyślnie rozwinięte**. Animacje rozwijania stosują się do preferencji ograniczonego ruchu w aplikacji. Rozwinięcie starszego rozumowania nie wymusza przewinięcia rozmowy na dół.

## Obsługiwani dostawcy

| Dostawca               | Modele                                                                 | Konfiguracja                                                                                               |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **OpenRouter**         | Claude, GPT, Gemini, DeepSeek, Qwen i inne                             | Klucz API z [openrouter.ai](https://openrouter.ai)                                                         |
| **Anthropic**          | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5 | Klucz API z [console.anthropic.com](https://console.anthropic.com)                                         |
| **OpenAI**             | GPT-6.1 Sol, GPT-6 Astra, GPT-6 Luna                                   | Klucz API z [platform.openai.com](https://platform.openai.com)                                             |
| **ChatGPT**            | Modele, które Twój plan ChatGPT oferuje w Codex, pobierane na bieżąco  | Aplikacja na komputer: **Zaloguj się przez ChatGPT**. Odpowiedzi wliczają się do limitów użycia planu.     |
| **Google AI**          | Gemini 3.8 Flash, Gemini 4 Argon                                       | Klucz API z [aistudio.google.com](https://aistudio.google.com)                                             |
| **DeepSeek**           | DeepSeek Flash, DeepSeek V4 Pro                                        | Klucz API z [platform.deepseek.com](https://platform.deepseek.com/api_keys)                                |
| **Z.ai**               | GLM-5.3, GLM-5.3-Flash, GLM-5.3-FlashX, GLM-5V-Turbo                   | Klucz API z [docs.z.ai](https://docs.z.ai/devpack/quick-start)                                             |
| **MiniMax**            | MiniMax-M3.1-Flash, MiniMax-M3                                         | Klucz API z [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key) |
| **xAI**                | Grok 4.7, Grok 4.6, Grok Build 0.1                                     | Klucz API z [console.x.ai](https://console.x.ai)                                                           |
| **Meta**               | Muse Spark 1.3, Muse Wonder                                            | Klucz API z [dev.meta.ai](https://dev.meta.ai)                                                             |
| **Kimi For Coding**    | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi For Coding                | Klucz API planu Kimi Code z [kimi.ai](https://www.kimi.ai/code/console). Tylko w aplikacji na komputer.    |
| **Moonshot AI**        | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi K3                        | Klucz API z [platform.moonshot.ai](https://platform.moonshot.ai/console/api-keys)                          |
| **Together AI**        | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Muse Spark Open                 | Klucz API z [together.ai](https://api.together.ai/settings/api-keys)                                       |
| **Fireworks AI**       | Kimi K3, DeepSeek V4.1 Flash, GLM 5.3, MiniMax-M3.1-Flash              | Klucz API z [fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)                               |
| **OpenCode Zen**       | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Big Pickle                      | Klucz API z [opencode.ai](https://opencode.ai/auth). Tylko w aplikacji na komputer.                        |
| **OpenCode Go**        | Kimi K3.1 Pro, MiniMax M3.1 Flash, GLM-5.3, DeepSeek V4.1 Flash        | Klucz API planu Go z [opencode.ai](https://opencode.ai/auth). Tylko w aplikacji na komputer.               |
| **Zgodny z OpenAI**    | Dowolny punkt końcowy w formacie OpenAI API                            | Własny adres bazowy i klucz; przełącznik między Completions API a Responses API                            |
| **Zgodny z Anthropic** | Dowolny punkt końcowy w formacie Anthropic API                         | Własny adres bazowy i klucz                                                                                |
| **Amazon Bedrock**     | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5 | Region i klucz API Bedrock albo klucze dostępu AWS w aplikacji na komputer                                 |
| **Google Vertex AI**   | Claude Sonnet 5.5, Claude Opus 5.5, Gemini 3.8 Flash, Gemini 4 Argon   | Projekt i lokalizacja z tokenem dostępu; klucz API obsługuje tylko Gemini                                  |

Bez serwera pośredniczącego: Twój klucz lub logowanie komunikuje się bezpośrednio z dostawcą. Żądania z przeglądarki podlegają zasadom CORS każdego dostawcy, a wdrożenia modeli różnią się niezawodnością strumieniowego przesyłania wywołań narzędzi. Zmierzone wyniki i kroki odtworzenia znajdziesz na stronie [Zgodność dostawców i modeli BYOK](/programmable/byok-provider-compatibility).

Gotowe ustawienia xAI, Meta, Kimi For Coding, Moonshot AI, Together AI, Fireworks AI i OpenCode korzystają z punktu końcowego czatu zgodnego z OpenAI danego dostawcy, więc różnią się tylko adresem bazowym i polecanymi modelami; pełna lista modeli pochodzi z models.dev. OpenCode Zen i Go wymieniają tylko modele udostępniane przez ten punkt końcowy, więc modele Claude, GPT i Gemini są tam pominięte: do nich używaj dostawcy Anthropic, OpenAI lub Google AI. Kimi For Coding i oba ustawienia OpenCode nie wysyłają nagłówków CORS, więc działają tylko w aplikacji na komputer.

**Amazon Bedrock** łączy się z Claude przez Messages API Bedrock pod adresem `bedrock-mantle.<region>.api.aws`, z identyfikatorami modeli Bedrock zaczynającymi się od `anthropic.`; własny identyfikator modelu może wskazywać profil wnioskowania, na przykład `us.anthropic.claude-opus-5-5`. Wybierz region, a potem zaloguj się kluczem API Bedrock albo, w aplikacji na komputer, identyfikatorem klucza dostępu, tajnym kluczem dostępu i opcjonalnym tokenem sesji, które podpisują każde żądanie za pomocą AWS Signature Version 4. Przeglądarki nie pozwalają, aby odpowiedź CORS Bedrock obejmowała nagłówek podpisu, więc aplikacja w przeglądarce przyjmuje tylko klucze API.

**Google Vertex AI** udostępnia Claude przez `:rawPredict`, a Gemini przez `:generateContent` w jednym projekcie Google Cloud. Wpisz identyfikator projektu i lokalizację (`global`, `us`, `eu` lub pojedynczy region; pojedyncze regiony udostępniają tylko starsze modele Claude) i wklej token dostępu z `gcloud auth print-access-token`. Tokeny dostępu wygasają po godzinie, więc gdy żądania zaczną się nie udawać, wklej nowy. Klucz API bez projektu korzysta z trybu ekspresowego Vertex AI, który udostępnia tylko modele Gemini.

**OpenRouter** można połączyć w konfiguracji z przewodnikiem przez logowanie zamiast wklejania klucza: OpenRouter tworzy klucz dla Pairdraw, przechowywany jak każdy inny klucz. W aplikacji na komputer logowanie otwiera przeglądarkę systemową i wraca na port tego komputera wybrany przez system (`http://localhost:<port>/oauth/openrouter`), więc nie uczestniczy w tym żadna strona spoza Twojego komputera; aplikacja w przeglądarce loguje się w wyskakującym oknie, więc zezwól jej na wyskakujące okna.

**ChatGPT** korzysta z Twojego planu ChatGPT zamiast klucza API, przez ten sam backend i logowanie co Codex CLI od OpenAI. Logowanie otwiera przeglądarkę i wraca do aplikacji na komputer pod adresem `localhost:1455`, jedynym, który OpenAI dla niego akceptuje, więc najpierw zamknij uruchomione `codex login`. Logowanie jest przechowywane jak klucz i samo się odświeża; lista modeli pochodzi z Twojego konta. Aplikacja w przeglądarce nie oferuje tego dostawcy.

## Zewnętrzne połączenia MCP

Wbudowany czat i agenci programistyczni mogą oprócz serwera Pairdraw korzystać z zaufanych serwerów [Model Context Protocol](https://modelcontextprotocol.io/). W **Ustawienia → MCP**, w sekcji **Połączenia MCP**, dodaj nazwane połączenie i włącz je:

- **Serwer zdalny**: punkt końcowy Streamable HTTP bez uwierzytelniania, z tokenem Bearer albo z **Logowaniem OAuth** dla hostowanych serwerów, takich jak Notion czy Linear. Zapisz połączenie, a potem kliknij **Zaloguj się**; strona logowania serwera otwiera się w wyskakującym oknie w aplikacji internetowej lub w przeglądarce systemowej w wersji komputerowej. Aplikacja rejestruje się na serwerze autoryzacji, używa PKCE i odświeża otrzymane tokeny.
- **Polecenie lokalne** (tylko aplikacja na komputer): program, który komunikuje się przez MCP za pomocą stdin i stdout, na przykład `npx` z argumentami `-y`, `@modelcontextprotocol/server-filesystem` i folderem, po jednym w wierszu, oraz opcjonalnymi zmiennymi środowiskowymi `NAME=value`. Gdy dane polecenie uruchamia się po raz pierwszy, aplikacja pyta o zgodę w oknie systemowym; pyta ponownie, gdy zmieni się program, argument lub nazwa zmiennej. Zmienne, które wybierają program lub wczytują do niego kod, takie jak `PATH`, `NODE_OPTIONS` czy `LD_PRELOAD`, są odrzucane.

Czat z bezpośrednim API podaje narzędzia każdego włączonego serwera z każdą wiadomością i oferuje je modelowi jako `mcp__<server>__<tool>`. Serwer, który nie odpowiada, jest pomijany w tej wiadomości i ponownie sprawdzany minutę później, a o polecenie lokalne, na które nie wyraziłeś zgody, aplikacja nie pyta ponownie, dopóki nie zmienisz jego połączenia. Wszystkie czaty współdzielą połączenia, które pozostają otwarte podczas odpowiedzi i zamykają się po kilku minutach bezczynności. Gdy czat pyta przed działaniami (**Ustawienia → AI**), pyta też przed wywołaniem zewnętrznego narzędzia, którego serwer nie oznacza jako tylko do odczytu. Zewnętrzne narzędzia włącza się i wyłącza razem z ich połączeniem, a nie na liście własnych narzędzi Pairdraw. W wersji komputerowej agenci ACP otrzymują te same połączenia przy starcie sesji; polecenie lokalne jest przekazywane agentowi dopiero po zatwierdzeniu w tym samym oknie systemowym, a aplikacja internetowa nie przekazuje żadnych. Pi otrzymuje połączenia zdalne. Tokeny Bearer, logowania OAuth i zmienne są przechowywane w skonfigurowanym magazynie danych uwierzytelniających, a nie w zwykłych ustawieniach. **Testuj połączenie** łączy się jeden raz i podaje, ile narzędzi oferuje serwer.

W aplikacji internetowej serwer zdalny musi akceptować żądania z adresu aplikacji (CORS); aplikacja na komputer łączy się przez własnego klienta HTTP.

Serwery zdalne muszą używać HTTPS. Do lokalnego programowania akceptowane są punkty końcowe HTTP pętli zwrotnej. Przed włączeniem serwera sprawdź go i upewnij się, że mu ufasz: jego narzędzia mogą czytać dane zewnętrzne lub wykonywać działania z użyciem podanych danych uwierzytelniających. Wbudowany projektowy serwer MCP Pairdraw jest podłączany automatycznie i nie trzeba go tu dodawać.

## Możliwości

Konfigurowalny katalog narzędzi obejmuje poniższe kategorie; narzędzia oferowane modelowi zależą od ustawień Dostępu do narzędzi:

- **Tworzenie**: ramki, kształty, tekst, komponenty, strony. Renderowanie JSX dla złożonych układów.
- **Styl**: wypełnienia, obwiednie, efekty, krycie, promień narożników, tryby mieszania.
- **Układ**: automatyczny układ, siatka, wyrównanie, odstępy, rozmiary.
- **Komponenty**: tworzenie komponentów, instancji, zestawów komponentów i slotów. Zarządzanie nadpisaniami. Nadawanie komponentom zachowań Reka UI, aby działały w podglądzie.
- **Zmienne**: tworzenie i edycja zmiennych, kolekcji i trybów. Powiązania z wypełnieniami.
- **Wyszukiwanie**: znajdowanie obiektów, selektory XPath, odczyt właściwości, lista stron, czcionek i zaznaczenia.
- **Inspekcja**: `get_jsx` (widok JSX w obie strony), `diff_create` i `diff_jsx` (różnice strukturalne), `diff_visual` (różnice pikseli), `describe` (rola semantyczna i wykrywanie problemów projektowych).
- **Analiza**: paleta kolorów, audyt typografii, spójność odstępów, wykrywanie skupisk.
- **Eksport**: PNG, SVG, JSX z klasami Tailwind. Weryfikacja wizualna przez `export_image`.
- **Wektory**: operacje logiczne, edycja ścieżek.

## Badanie wariantów

**Niech się gotuje**, czapka kucharza pod polem wiadomości, bada prośbę zamiast odpowiadać na nią raz:

- **Warianty** prosi o od dwóch do sześciu projektów obok siebie, każdy w nowej ramce najwyższego poziomu na prawo od wszystkiego na stronie. Wybierz, czy badają **Układ** (strukturę i rozmieszczenie przy jednym stylu wizualnym), czy **Styl** (kolory, typografię i obrazy przy jednym układzie). Gdy warstwa jest zaznaczona lub wspomniana, warianty wychodzą od niej i zostawiają ją bez zmian.
- **Bez iteracji** prosi o jeden projekt w jednym przebiegu, bez przeglądu i poprawek, które asystent zwykle wykonuje.

Wybór działa w kolejnych wiadomościach, a przycisk go pokazuje, dopóki nie ustawisz go z powrotem na **Wyłączone**.

## Notatki dla AI

Zaznacz warstwę i dodaj **Notatki dla AI** na dole panelu Design. **Kontekst** mówi agentom, co warstwa znaczy lub robi, na przykład „otwiera okno rejestracji”; **Prompt** to prośba dotycząca warstwy, którą **Uruchom prompt** wysyła do czatu. Wiadomość zawiera notatki warstw, których dotyczy: wspomnianych i zaznaczonych, a gdy ich brak, całej strony. Agenci respektują kontekst, a na prompt reagują tylko na prośbę. Notatki są zapisywane w pliku razem z warstwą, a notatki `context` i karty promptów z plików `.pen` są odczytywane tak samo.

## Kontrola wizualna

Asystent może sprawdzać swoją pracę wizualnie. Dzięki domyślnie włączonemu `export_image` może po utworzeniu lub zmianie projektu wykonać zrzut ekranu i porównać wynik z pierwotną prośbą. Pozwala to wychwycić problemy z układem, brakujące elementy i niezgodne kolory, które umknęłyby przy odpowiedziach czysto tekstowych. Domyślnie włączone `diff_visual` porównuje zmieniony obiekt z kopią wzorcową i zwraca zmienione piksele oraz obszar, dzięki czemu asystent może potwierdzić, że zmiana nie wyszła poza cel.

## Wiadomości w trakcie pracy asystenta

Możesz pisać dalej, gdy trwa odpowiedź. **Enter** wysyła wiadomość, gdy tylko zakończą się wywołania narzędzi w bieżącym kroku, więc wbudowane AI może zmienić kierunek bez zatrzymywania; **Alt+Enter** czeka, aż asystent skończy całą pracę. Oczekujące wiadomości są wyświetlane przygaszone pod odpowiedzią, a każdą można usunąć przyciskiem. **Escape** zatrzymuje odpowiedź i od razu wysyła to, co czeka, a **strzałka w górę** w pierwszym wierszu przywraca oczekujące wiadomości do edycji. Agenci ACP i Pi odbierają oczekującą wiadomość po zakończeniu swojej tury.

## Zatrzymywanie odpowiedzi

**Stop** natychmiast kończy odpowiedź. Wywołanie narzędzia, które już trwa, zostaje dokończone, a jego zmiana należy do odpowiedzi; wywołania czekające na swoją kolej niczego nie zmieniają. Odpowiedź zostaje oznaczona jako _Zatrzymano_, jej rozumowanie i niedokończone wywołania przestają wyglądać na trwające, a Twoja następna wiadomość informuje asystenta, czy te wywołania zmieniły dokument.

## Cofanie zmian asystenta

Każde wywołanie narzędzia, które zmienia dokument, to jeden krok w Edycja → Cofnij. Cofnięcie go skrótem <kbd>⌘</kbd><kbd>Z</kbd> oznacza wywołanie w czacie jako _Cofnięto_. Odpowiedź, w której cofnięto tylko część zmian, podaje ich liczbę; odpowiedź z cofniętymi wszystkimi zmianami jest przygaszona i oznaczona jako _Zmiany cofnięte_. Ponowienie usuwa oznaczenia. Oznaczenia są zapisywane razem z rozmową.

**Cofnij zmiany** w odpowiedzi cofa jej zmiany, dopóki od tego czasu nic nie edytowano, a **Przywróć zmiany** przywraca cofnięte zmiany, dopóki Ponów nadal może to zrobić. **Wygeneruj ponownie** i edycja ostatniej wiadomości najpierw cofają zmiany zastępowanej odpowiedzi, o ile to możliwe.

Twoja następna wiadomość informuje asystenta, które z jego zmian cofnąłeś lub ponowiłeś, aby nie budował na zmianach, których już nie ma. Jeśli cofniesz zmiany asystenta, gdy jeszcze pracuje, dowie się o tym przy następnym wywołaniu narzędzia.

## Śledzenie asystenta

Gdy włączona jest opcja **Śledź agentów podczas pracy**, czyli przycisk z celownikiem u góry czatu AI, widok podąża za asystentem w trakcie jego pracy, także na inną stronę, gdy edytuje tam warstwy. Śledzenie kończy się, gdy odpowiedź się zakończy, zostanie zatrzymana lub się nie powiedzie. Kliknięcie, przewijanie, powiększanie, zmiana strony lub Escape kończą śledzenie z Twojej inicjatywy.

## Obserwowanie, jak asystent rysuje {#watching-the-assistant-draw}

Gdy agent edytuje otwartą stronę, czy to wbudowany czat, czy agent programistyczny przez MCP, obszar roboczy pokazuje jego pracę: każda dodana warstwa rysuje się po kolei, zmieniane warstwy błyskają, a ramki, w których pracuje, migoczą w fioletowym obrysie. Gdy skończy, błyskają raz, a powiadomienie podaje liczbę dodanych i zmienionych warstw; **Pokaż** zaznacza je i przybliża do nich widok. Animacja jest rysowana nad obszarem roboczym i nigdy nie zmienia dokumentu. Wyłączysz ją opcją **Animuj zmiany AI** w **Ustawienia → Modele → Czat**; pozostaje też wyłączona, gdy **Animacje** są wyłączone, system prosi o ograniczenie ruchu albo włączony jest **Tryb ultralekki**, i wtedy zmiany po prostu się pojawiają.

## Powiadomienia

Gdy agent prosi o uprawnienie, a Ty nie odpowiesz przez kilka sekund, Pairdraw wysyła powiadomienie systemowe, więc w trakcie jego pracy możesz korzystać z innej aplikacji. **Ustawienia → Powiadomienia** pozwala też włączyć powiadomienia o zakończeniu lub niepowodzeniu odpowiedzi. Są wysyłane tylko wtedy, gdy Pairdraw działa w tle lub pokazuje inny dokument, a kliknięcie powiadomienia otwiera czat danego dokumentu. W przeglądarce najpierw kliknij tam **Zezwól na powiadomienia**; aplikacja na komputer stosuje się do systemowych ustawień powiadomień.

## Przykładowe prompty

- „Utwórz kartę z tytułem, opisem i niebieskim przyciskiem”
- „Ustaw wszystkim przyciskom na tej stronie ten sam promień narożników”
- „Jakie czcionki są używane w tym pliku?”
- „Zmień tło zaznaczonej ramki na gradient od niebieskiego do fioletowego”
- „Wyeksportuj zaznaczoną ramkę jako SVG”
- „Znajdź wszystkie obiekty tekstowe z rozmiarem czcionki mniejszym niż 12”
- „Opisz zaznaczony komponent: jaką rolę zdaje się pełnić?”
- „Pokaż mi JSX tej ramki”
- „Zrób z tego komponentu przełącznik, który mogę wypróbować w podglądzie”

## Wskazówki

- Zaznacz obiekty przed zadaniem pytania: asystent wie, co jest zaznaczone.
- Podawaj dokładne kolory, rozmiary i położenie, aby uzyskać precyzyjne wyniki.
- Asystent może zmienić kilka obiektów w jednej wiadomości.
- Podczas odpowiedzi możesz przeglądać inne strony: asystent dalej pracuje na stronie, na której zaczęła się wiadomość, a jego podglądy pojawią się po powrocie. Gdy jesteś gdzie indziej, czat pokazuje, nad którą stroną pracuje asystent, i oferuje **Przejdź do strony**, aby wrócić.
- Cofnij wszystko, co Ci się nie podoba, przez Edycja → Cofnij lub **Cofnij zmiany**; widzą to zarówno czat, jak i asystent.
- Po każdym wykonaniu narzędzia cały układ jest przeliczany automatycznie.
