---
title: Czat AI
description: Wbudowany asystent z ponad 90 narzędziami do tworzenia i zmieniania projektów.
---

# Czat AI

Naciśnij <kbd>⌘</kbd><kbd>J</kbd> albo <kbd>Ctrl</kbd> + <kbd>J</kbd> lub kliknij przycisk z iskrami wśród działań dokumentu na górnym pasku, aby otworzyć asystenta we własnej kolumnie. Asystent tworzy figury, zmienia style i układ, pracuje z komponentami oraz analizuje dokument.

## Konfiguracja

Przy pierwszym uruchomieniu Pairdraw nie otwiera okna konfiguracji. Dopóki żaden model nie jest skonfigurowany, szuka [agenta programistycznego](/programmable/coding-agents) zainstalowanego już na tym komputerze: najpierw Claude Code, potem Codex, potem Gemini CLI. Czat informuje, którego używa, i oferuje **Zmień**, aby wybrać inny model. Jeśli agent wymaga jeszcze zalogowania, swojego programu ACP lub serwera MCP, kolumna czatu pokazuje do tego przycisk; bez jego kliknięcia nic nie jest logowane ani instalowane. Model skonfigurowany przez Ciebie nigdy nie zostaje zastąpiony.

Gdy Pairdraw nie znajdzie agenta, wysłanie promptu otwiera konfigurację z przewodnikiem. Pyta ona, w czym ma pomagać AI i z czego już korzystasz: z agenta programistycznego, takiego jak Claude Code, Codex lub Gemini CLI w aplikacji na komputer, z konta API albo z serwera lokalnego lub firmowego. Łączy ten dostęp i przypisuje go do ról **Design agent** i **Vision**, nie zmieniając ręcznej konfiguracji. W przypadku OpenRouter wystarczy się zalogować zamiast wklejać klucz API: aplikacja na komputer wraca z logowania przez port na tym komputerze, a aplikacja internetowa loguje się w wyskakującym oknie. Konfigurację możesz uruchomić ponownie w dowolnej chwili w **Ustawienia → Modele → Uruchom konfigurację z przewodnikiem**. Aby skonfigurować modele ręcznie:

1. Otwórz panel czatu AI.
2. Kliknij ikonę ustawień.
3. Dodaj model i skonfiguruj dostawcę, identyfikator modelu, dane uwierzytelniające oraz możliwości.
4. Zapisz model i przypisz go do roli **Design agent**.

Możesz utworzyć kilka modeli i osobno przypisać je do projektowania, przeglądu, szybkich zadań oraz przetwarzania obrazów. Modele korzystające z tego samego połączenia dostawcy używają wspólnych zapisanych danych uwierzytelniających.

### Dostawcy

| Dostawca               | Modele                                                                 | Konfiguracja                                                                                               |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **OpenRouter**         | Claude, GPT, Gemini, DeepSeek, Qwen i inne                             | Klucz API z [openrouter.ai](https://openrouter.ai)                                                         |
| **Anthropic**          | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5 | Klucz API z [console.anthropic.com](https://console.anthropic.com)                                         |
| **OpenAI**             | GPT-6.1 Sol, GPT-6 Astra, GPT-6 Luna                                   | Klucz API z [platform.openai.com](https://platform.openai.com)                                             |
| **Google AI**          | Gemini 3.8 Flash, Gemini 4 Argon                                       | Klucz API z [aistudio.google.dev](https://aistudio.google.dev)                                             |
| **DeepSeek**           | DeepSeek Flash, DeepSeek V4 Pro                                        | Klucz API z [platform.deepseek.com](https://platform.deepseek.com/api_keys)                                |
| **Z.ai**               | GLM-5.3, GLM-5.3-Flash, GLM-5.3-FlashX, GLM-5V-Turbo                   | Klucz API zgodnie z [dokumentacją Z.ai](https://docs.z.ai/devpack/quick-start)                             |
| **MiniMax**            | MiniMax-M3.1-Flash, MiniMax-M3                                         | Klucz API z [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key) |
| **xAI**                | Grok 4.7, Grok 4.6, Grok Build 0.1                                     | Klucz API z [console.x.ai](https://console.x.ai)                                                           |
| **Meta**               | Muse Spark 1.3, Muse Wonder                                            | Klucz API z [dev.meta.ai](https://dev.meta.ai)                                                             |
| **Kimi For Coding**    | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi For Coding                | Klucz API planu Kimi Code z [kimi.ai](https://www.kimi.ai/code/console). Tylko w aplikacji desktopowej.    |
| **Moonshot AI**        | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi K3                        | Klucz API z [platform.moonshot.ai](https://platform.moonshot.ai/console/api-keys)                          |
| **Together AI**        | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Muse Spark Open                 | Klucz API z [together.ai](https://api.together.ai/settings/api-keys)                                       |
| **Fireworks AI**       | Kimi K3, DeepSeek V4.1 Flash, GLM 5.3, MiniMax-M3.1-Flash              | Klucz API z [fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)                               |
| **OpenCode Zen**       | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Big Pickle                      | Klucz API z [opencode.ai](https://opencode.ai/auth). Tylko w aplikacji desktopowej.                        |
| **OpenCode Go**        | Kimi K3.1 Pro, MiniMax M3.1 Flash, GLM-5.3, DeepSeek V4.1 Flash        | Klucz API planu Go z [opencode.ai](https://opencode.ai/auth). Tylko w aplikacji desktopowej.               |
| **Zgodny z OpenAI**    | Dowolny punkt końcowy w formacie OpenAI API                            | Własny adres bazowy i klucz; wybór Completions API lub Responses API                                       |
| **Zgodny z Anthropic** | Dowolny punkt końcowy w formacie Anthropic API                         | Własny adres bazowy i klucz                                                                                |
| **Amazon Bedrock**     | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5 | Region i klucz API Bedrock albo klucze dostępu AWS w aplikacji desktopowej |
| **Google Vertex AI**   | Claude Sonnet 5.5, Claude Opus 5.5, Gemini 3.8 Flash, Gemini 4 Argon   | Projekt i lokalizacja z tokenem dostępu; klucz API obsługuje tylko Gemini  |

Pairdraw nie wymaga osobnego serwera ani subskrypcji: żądania są wysyłane bezpośrednio do dostawcy. W przeglądarce podlegają jego zasadom CORS. Poszczególne wdrożenia modeli różnią się niezawodnością przesyłania wywołań narzędzi. Wyniki pomiarów znajdują się na stronie [Zgodność dostawców i modeli BYOK](/programmable/byok-provider-compatibility).

### Zewnętrzne połączenia MCP

W wersji komputerowej agenci ACP mogą korzystać z zaufanych zdalnych serwerów [Model Context Protocol](https://modelcontextprotocol.io/). Otwórz **Ustawienia → Połączenia MCP**, dodaj nazwany punkt końcowy Streamable HTTP, opcjonalnie zapisz token Bearer i włącz połączenie.

Token jest przechowywany w skonfigurowanym magazynie danych uwierzytelniających i odczytywany dopiero podczas uruchamiania sesji ACP.

Wbudowany czat z bezpośrednim API również korzysta z włączonych połączeń i udostępnia ich narzędzia modelowi jako `mcp__<serwer>__<narzędzie>`. Hostowane serwery, takie jak Notion czy Linear, używają **Logowania OAuth**: zapisz połączenie, a potem kliknij **Zaloguj się**. W aplikacji desktopowej połączenie może też być **Poleceniem lokalnym**, czyli programem, który mówi MCP przez stdin i stdout, z jednym argumentem w wierszu i opcjonalnymi zmiennymi środowiskowymi `NAZWA=wartość`. Przed pierwszym uruchomieniem danego polecenia aplikacja pyta o zgodę w oknie systemowym; zmienne takie jak `PATH` czy `NODE_OPTIONS`, które ładują kod, są niedozwolone. Dopóki czat pyta przed działaniami, pyta też przed każdym zewnętrznym narzędziem, którego serwer nie oznacza jako tylko do odczytu. W aplikacji webowej zdalny serwer musi akceptować żądania z adresu aplikacji (CORS).

Zdalny serwer musi używać HTTPS. W lokalnym środowisku programistycznym dozwolone są adresy pętli zwrotnej przez HTTP. Włączaj wyłącznie zaufane serwery. Wbudowany serwer MCP Pairdraw jest podłączany automatycznie.

## Sesje agentów

Agent programistyczny prowadzi swoje sesje z modelem, poziomem rozumowania i trybem. Pole wiadomości oferuje model, poziom rozumowania i tryb, które Claude Code, Codex i Gemini CLI reklamują dla swoich sesji. Wybór działa natychmiast w bieżącej sesji oraz w późniejszych sesjach z tym agentem, z wyjątkiem trybów pomijających pytania o uprawnienia, które obowiązują tylko przez jedną sesję.

W wersji komputerowej każdy czat może dać swojemu agentowi programistycznemu folder projektu do pracy, wybrany w nagłówku czatu i najpierw potwierdzony. Sesje tam zaczynają się w domyślnym trybie agenta, a tylko wybrany model i poziom rozumowania są przenoszone.

## Możliwości

Asystent korzysta z ponad 90 narzędzi do tworzenia, stylizowania, układu, komponentów, zmiennych, wyszukiwania, inspekcji, analizy, eksportu i operacji wektorowych. Do inspekcji należą `get_jsx` (widok JSX w obie strony), `diff_create` i `diff_jsx` (różnice strukturalne), `diff_visual` (różnice pikseli) oraz `describe` (rola semantyczna i wykrywanie problemów projektowych).

## Umiejętności

Umiejętności to foldery z plikiem `SKILL.md` w formacie [Agent Skills](https://agentskills.io/specification): instrukcje do określonego rodzaju pracy z opcjonalnymi plikami pomocniczymi. Wbudowane AI widzi nazwę i opis każdej włączonej umiejętności i wczytuje jej instrukcje, gdy prośba pasuje; skrypty z umiejętności nie są uruchamiane.

W **Ustawienia → Umiejętności** prześlij umiejętność jako ZIP jej folderu lub jako `SKILL.md`. W aplikacji desktopowej odczytywane są też `~/.agents/skills` i `~/.claude/skills` oraz foldery `.agents/skills` i `.claude/skills` obok otwartego dokumentu, używane dopiero po **Zaufaj folderowi**. Pairdraw ma wbudowane umiejętności: przewodniki po landing page’ach, aplikacjach mobilnych, aplikacjach webowych, pulpitach, slajdach, systemach projektowych i Tailwind CSS v4 oraz `layout`, `restyle`, `dark-mode` i `design-review` do istniejących projektów; twoja umiejętność o tej samej nazwie ma pierwszeństwo. Wpisz `/` na początku wiadomości lub użyj **Wybierz umiejętność** pod polem wiadomości, aby wybrać umiejętność, i `@`, aby wspomnieć warstwę, stronę lub umiejętność. Wzmianki pojawiają się jako chipy, także w odpowiedziach; kliknięcie pokazuje warstwę na płótnie.

## Badanie wariantów

**Niech się gotuje**, czapka kucharza pod polem wiadomości, bada prośbę zamiast odpowiadać na nią raz:

- **Warianty** prosi o od dwóch do sześciu projektów obok siebie, każdy w nowej ramce najwyższego poziomu na prawo od wszystkiego na stronie. Wybierz, czy badają **Układ** (strukturę i rozmieszczenie przy jednym stylu), czy **Styl** (kolory, typografię i obrazy przy jednym układzie). Gdy warstwa jest zaznaczona lub wspomniana, warianty wychodzą od niej i zostawiają ją bez zmian.
- **Bez iteracji** prosi o jeden projekt w jednym przebiegu, bez przeglądu i poprawek, które asystent zwykle wykonuje.

Wybór działa w kolejnych wiadomościach, a przycisk go pokazuje, dopóki nie ustawisz go z powrotem na **Wyłączone**.

## Notatki dla AI

Zaznacz warstwę i dodaj **Notatki dla AI** na dole panelu Projekt. **Kontekst** mówi agentom, co warstwa znaczy lub robi, na przykład „otwiera okno rejestracji”; **Prompt** to prośba dotycząca warstwy, którą **Uruchom prompt** wysyła do czatu. Wiadomość zawiera notatki warstw, których dotyczy: wspomnianych i zaznaczonych, a gdy ich brak — całej strony. Agenci szanują kontekst, a na prompt reagują tylko na prośbę. Notatki są zapisywane w pliku razem z warstwą, a notatki `context` i karty promptów z plików `.pen` są odczytywane tak samo.

## Kontrola wizualna

Po utworzeniu lub zmianie projektu asystent może wywołać `export_image`, uzyskać obraz wyniku i porównać go z pierwotnym poleceniem. Pozwala to wykryć problemy z układem, brakujące elementy i nieprawidłowe kolory. Domyślnie włączone `diff_visual` porównuje zmieniony obiekt z kopią wzorcową i zwraca zmienione piksele oraz obszar, dzięki czemu asystent może sprawdzić, że zmiana nie wyszła poza cel.

## Wskazówki

- Przed wysłaniem polecenia zaznacz odpowiednie obiekty: asystent widzi zaznaczenie.
- Dokładnie podawaj kolory, rozmiary i położenie.
- Jedna wiadomość może zmienić kilka obiektów.
- Podczas odpowiedzi możesz przeglądać inne strony: asystent dalej pracuje na stronie, na której zaczęła się wiadomość, a jego podglądy pojawią się po powrocie. Gdy jesteś na innej stronie, czat pokazuje, nad którą pracuje asystent, i udostępnia przycisk **Przejdź do strony**. Jeśli asystent sam zmieni stronę, widok podąża za nim.
- Wszystkie zmiany AI można cofnąć.
- Po każdym wywołaniu narzędzia układ jest przeliczany automatycznie.
