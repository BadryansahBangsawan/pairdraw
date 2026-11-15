---
title: Eksport
description: Eksport zawartości dokumentu do obrazów, PDF, PowerPoint, draw.io, `.fig`, JSX, HTML lub historyjek Storybook, z zasadami zastępowania czcionek dla eksportu rastrowego i PDF.
---

# Eksport

Eksportuj projekty z terminala — do obrazów rastrowych, grafiki wektorowej, PDF, edytowalnych prezentacji PowerPoint, diagramów draw.io, wycinków `.fig`, kodu JSX, HTML lub historyjek Storybook.

Aplikacja w kompilacjach Pairdraw nie oferuje już eksportu do PowerPoint ani draw.io; CLI nadal zapisuje oba formaty.

## Eksport obrazów

```sh
pairdraw export design.fig                           # PNG (default)
pairdraw export design.fig -f jpg -s 2 -q 90        # JPG at 2×, quality 90
pairdraw export design.fig -f webp -s 3             # WEBP at 3×
pairdraw export design.fig -f svg                   # SVG vector
pairdraw export design.fig -f pdf                   # PDF
pairdraw export design.fig -f pptx                  # editable PowerPoint
pairdraw export design.fig -f drawio                # draw.io diagram
pairdraw export design.fig -f fig --page "Page 1"   # export one page as .fig
pairdraw export design.fig -f fig --node 1:23        # export one node as .fig
pairdraw export design.fig -f html --css tailwind    # export an HTML fragment with Tailwind classes
```

Opcje:

- `-f` — format: `png`, `jpg`, `webp`, `svg`, `pdf`, `pptx`, `drawio`, `jsx`, `tailwind-jsx`, `html`, `fig`, `storybook`;
- `-s` — skala eksportu (domyślnie `1`);
- `-q` — jakość od `0` do `100` (tylko JPG i WEBP);
- `-o` — ścieżka pliku wynikowego;
- `--page` — nazwa strony;
- `--node` — identyfikator konkretnego obiektu.

## Zasady zastępowania czcionek {#font-substitution-policy}

W eksporcie PNG, JPG, WEBP i PDF z pliku oraz w `pairdraw convert` możesz wybrać, jak traktować brakujące lub zastąpione czcionki:

```sh
pairdraw export design.fig -f pdf --font-policy strict
pairdraw export design.fig -f png --font-policy warn
pairdraw export design.fig -f webp --font-policy allow
pairdraw convert design.pen --font-policy strict
```

- `warn` (domyślnie) — zgłasza zamienniki i kontynuuje eksport.
- `strict` — kończy działanie z niezerowym kodem wyjścia, jeśli przygotowanie czcionek nie może wiernie odnaleźć żądanych krojów.
- `allow` — eksportuje bez dodatkowej kontroli wierności czcionek.

Najpierw uruchom [`pairdraw fonts`](./inspecting#font-diagnostics), aby sprawdzić, których krojów to dotyczy. Przygotowanie eksportu może korzystać ze skonfigurowanych dostawców czcionek, więc jego wynik może różnić się od diagnostyki pliku wykonywanej offline.

`convert` wczytuje czcionki dla plików `.pen`, draw.io i Mermaid, które przechowują intencję układu zamiast rozmiarów: przed zapisem rozmieszcza je ponownie, mierząc tekst w ich własnych czcionkach, więc `strict` zatrzymuje polecenie, zanim cokolwiek zostanie zapisane. Schemat blokowy Mermaid (`.mmd` lub `.mermaid`) jest rozmieszczany podczas odczytu, a jego tekst mierzony w czcionkach, którymi jest rysowany.

Te zasady nie dotyczą eksportu z uruchomionej aplikacji ani eksportu do SVG, PowerPoint, JSX, HTML i `.fig`. Sprawdzają odnalezienie czcionek, a nie pełną równoważność wizualną z Figmą.

## Eksport do JSX

Eksport do JSX z klasami narzędziowymi Tailwind:

```sh
pairdraw export design.fig -f tailwind-jsx    # or: -f jsx --style tailwind
```

Wynik:

```html
<div className="flex flex-col gap-4 p-6 bg-white rounded-xl">
  <p className="text-2xl font-bold text-[#1D1B20]">Card Title</p>
  <p className="text-sm text-[#49454F]">Description text</p>
</div>
```

Obsługiwane jest też `--style pairdraw`, czyli natywny format JSX (zobacz [Renderer JSX](../jsx-renderer)).

## Eksport do HTML

Domyślnie polecenie tworzy fragment HTML ze stylami wbudowanymi; zamiast nich można użyć klas narzędziowych Tailwind:

```sh
pairdraw export design.fig -f html
pairdraw export design.fig -f html --css tailwind
```

Opcja `--html standalone` tworzy dokument HTML, który można otworzyć w przeglądarce, ze stylami resetującymi i opakowaniem strony. Samodzielny HTML służy do przekazywania projektu i kodu, a nie do zastąpienia renderera z dokładnością co do piksela:

```sh
pairdraw export design.fig -f html --html standalone --css inline
pairdraw export design.fig -f html --html standalone --css tailwind
pairdraw export design.fig -f html --html standalone --css tailwind --assets external
```

W samodzielnym wyniku Tailwind jest kompilowany podczas eksportu, więc nie zależy od środowiska uruchomieniowego Tailwind w przeglądarce. `--assets external` zapisuje CSS i wyodrębnione obrazy obok pliku HTML. `--fonts assets` w połączeniu z zewnętrznymi zasobami wyszukuje wykryte czcionki tekstu z SceneGraph przez skonfigurowanych w Pairdraw dostawców czcionek internetowych i tworzy lokalne pliki `@font-face`.

Eksport HTML zapisuje nazwę każdej warstwy w atrybucie `data-name`. `--no-layer-names` pomija nazwy, a `--layer-ids` dodaje identyfikator każdej warstwy jako `data-pairdraw-node-id` dla narzędzi, które łączą znaczniki z dokumentem.

Eksport HTML jest dostępny w trybie plikowym.

### Tokeny w eksportowanym kodzie

HTML i JSX z Tailwind zapisują właściwości powiązane ze zmiennymi jako tokeny projektu, z których pochodzą: wypełnienie powiązane z `Primary` to `background-color: var(--color-primary)`, a w Tailwind `bg-primary` albo `bg-(--name)` dla tokenu spoza przestrzeni nazw Tailwind. Warstwa ustawiona na inny tryb dostaje atrybut tego trybu, na przykład `data-theme="dark"`, więc tokeny rozwiązują się tak, jak rysuje je obszar roboczy.

Wartość pozostaje dosłowna tam, gdzie CSS by jej nie odtworzył: warstwa nie rysuje już wartości zmiennej, token jest bez jednostki tam, gdzie potrzebna jest długość, albo warstwa znajduje się w trybie, który może wybrać tylko jej własny warunek, na przykład zapytanie `@media`. Samodzielny HTML zawiera arkusz stylów dla używanych tokenów; dla fragmentów i JSX wygeneruj go poleceniem `pairdraw tokens` (poniżej).

## Tokeny projektu

Zapis zmiennych dokumentu jako niestandardowych właściwości CSS:

```sh
pairdraw tokens design.fig > tokens.css
pairdraw tokens design.fig --format tailwind > theme.css
pairdraw tokens design.fig --collection Theme --type COLOR
```

Domyślny tryb każdej kolekcji trafia do `:root`. Każdy inny tryb nadpisuje różniące się wartości pod swoim warunkiem: `[data-theme="dark"]` dla trybu Dark kolekcji Theme albo selektor lub zapytanie `@media`, które nazywa tryb. Aliasy pozostają odwołaniami `var()` i są deklarowane ponownie w każdym trybie, który zmienia ich cel, więc przełączenie `data-theme` na dowolnym elemencie zmienia styl wszystkiego, co jest na nim zbudowane.

```css
:root {
  --color-blue-500: #3b82f5;
  --color-primary: var(--color-blue-500);
}

/* Theme: Dark */
[data-theme='dark'] {
  --color-primary: var(--color-blue-300);
}
```

`--format tailwind` umieszcza tokeny z przestrzenią nazw Tailwind v4 (`--color-*`, `--spacing-*`, `--radius-*`, `--text-*`, …) w `@theme`, dzięki czemu działają `bg-primary` i `rounded-card`, oraz dodaje `@custom-variant` dla każdego trybu, więc `dark:bg-surface` podąża za tym samym warunkiem. Zaimportuj plik po `@import "tailwindcss";`. Nazwy pochodzą ze składni kodu zmiennej, gdy wskazuje ona niestandardową właściwość (`--x` lub `var(--x)`), a w przeciwnym razie z nazwy i typu zmiennej: `Blue/500` jako kolor to `--color-blue-500`.

Tokeny, których nie da się zapisać, na przykład zmienne logiczne albo warunek niebędący selektorem ani zapytaniem, są wypisywane na stderr i pomijane. Polecenie działa w trybie plikowym i z uruchomioną aplikacją.

### Tokeny projektu W3C

`--format dtcg` zapisuje zmienne i style jako [tokeny projektu W3C](https://www.designtokens.org/tr/2025.10/format/) w folderze:

```sh
pairdraw tokens design.fig --format dtcg --out tokens
```

Każdy tryb kolekcji to jeden plik, `Theme/Light.tokens.json` i `Theme/Dark.tokens.json`, w kształcie, który Figma importuje jako tryb: długości w `px`, czasy w `s`, wartości logiczne jako liczby oznaczone `com.figma.type`, a aliasy do innej kolekcji nazywają ją w `com.figma.aliasData`. Style tekstu i efektów stają się tokenami typografii i cienia w `styles.tokens.json`, trzymanymi osobno, ponieważ import Figmy odrzuca tokeny złożone. `tokens.resolver.json` to resolver DTCG, który przełącza tryby każdej kolekcji i nakłada pozostałe, dla narzędzi takich jak Style Dictionary. Własne pola Pairdraw, takie jak jednostka `rem` tokenu, nazwa CSS, zakresy czy wyrażenie `clamp()`, oraz warunek każdego trybu są zapisywane w `$extensions["dev.pairdraw"]`, więc eksport odczytuje się z powrotem dokładnie.

Pliki tokenów zaimportujesz do dokumentu narzędziem `import_design_tokens`, przekazując ścieżkę i treść każdego pliku:

```sh
pairdraw tool call import_design_tokens design.fig --args-file tokens.json --write
```

Narzędzie odczytuje plik na tryb pogrupowany w folderach, resolver z plikami, do których się odwołuje, albo plik Tokens Studio z `$themes`. Kolekcje i tryby o istniejących nazwach oraz zmienne i style o tych samych nazwach są aktualizowane; reszta jest dodawana, a nic nie jest usuwane. Wynik wymienia, co dodano, zaktualizowano i pominięto, z powodem każdego pominięcia.

## Eksport do Storybook

Polecenie generuje jeden plik CSF3 `.stories.ts` dla każdego zestawu komponentów lub komponentu:

```sh
pairdraw export design.fig -f storybook                      # React stories in ./design-stories/
pairdraw export design.fig -f storybook --framework vue -o src/stories
pairdraw export design.fig -f storybook --css tailwind     # components styled with Tailwind
pairdraw export design.fig -f storybook --framework html --page "Components"
pairdraw export design.pen -f storybook -o src/stories --watch  # re-export on every save
pairdraw export 'src/**/*.pen' -f storybook --beside --watch    # stories next to each design
pairdraw export design.fig -f storybook --rules stories.json    # stories and titles by rule
```

### Mniej historyjek na pasku bocznym

Każdy plik historyjek zaczyna się od historyjki `Default`, czyli wariantu, który projekt pokazuje w spoczynku, ze wszystkimi kontrolkami. Każda inna historyjka wariantu lub stanu ma tag `variant`, a każdy plik tagi `pairdraw` i `page:<page>`, na przykład `page:icons`. Filtr paska bocznego Storybooka wybiera według tych tagów, a `.storybook/main.ts` może ustawić, co pokazuje domyślnie, na przykład jedną historyjkę na komponent i bez strony ikon:

```ts
const config: StorybookConfig = {
  // …
  tags: {
    variant: { defaultFilterSelection: 'exclude' },
    'page:icons': { excludeFromSidebar: true }
  }
}
```

### Historyjki i tytuły według reguł

O tym, czego nie da się zrobić tagami, na przykład o pominięciu komponentów albo pokazaniu zestawu ikon jako galerii, decyduje plik reguł. Eksport odczytuje `pairdraw.stories.json` z katalogu roboczego, jeśli istnieje, albo plik wskazany przez `--rules`, i przy obserwacji robi to ponownie przy każdym eksporcie:

```json
{
  "rules": [
    { "match": "**", "title": "Design system/{page}/{name}" },
    { "match": "Icons/**", "stories": "gallery" },
    { "match": "**/_*", "stories": "none" }
  ]
}
```

Reguła dotyczy każdego pliku historyjek, którego ścieżka `<page>/<name>` pasuje do jej wzorca glob, według nazw w dokumencie: nazwy strony i zestawu komponentów lub komponentu albo przedrostka komponentów nazwanych z ukośnikami, na przykład `Icons/icon`. Każda pasująca reguła jest stosowana po kolei, więc późniejsza reguła nadpisuje wcześniejszą, każde pole osobno. `generate: false` zachowuje statyczne historyjki w eksporcie Vue lub React tam, gdzie powstałby komponent, na przykład dla zestawu ikon. `stories` przyjmuje `variants` — historyjkę na wariant lub stan, jak bez reguł; `single` — samą historyjkę `Default`; `gallery` — `Default` i historyjkę `Gallery`, która rozkłada wszystkie warianty z ich nazwami, dla historyjek statycznych; albo `none`, które pomija plik. `title` to tytuł pliku z wypełnianymi `{document}`, `{page}`, `{name}` i `{path}` (tytułem, jaki miałby plik); tytuły, które wyjdą takie same, są rozdzielane jak zawsze. Reguły dopasowują nazwy z dokumentu, nigdy zmieniony tytuł, więc zmiana tytułu pliku nie zmienia reguł, które go dotyczą.

### Projekty obok historyjek

Trzymaj plik projektu komponentu w folderze komponentu i eksportuj z `--beside`: historyjki każdego dokumentu, obrazy projektu i manifest `.pairdraw-stories.json` trafiają do folderu tego dokumentu, obok kodu komponentu. Wzorzec `stories` w `.storybook/main.ts`, na przykład `../src/**/*.stories.ts`, znajdzie je bez dodatkowej konfiguracji.

Możesz podać kilka dokumentów albo ujęty w cudzysłów wzorzec, na przykład `'src/**/*.pen'`, który Pairdraw rozwija samodzielnie (Node.js 22 lub nowszy). Kilka dokumentów wymaga `--beside` albo `--output`, a `--page` działa tylko z jednym dokumentem. Dokumenty są eksportowane kolejno, a gdy któryś się nie powiedzie, pozostałe nadal są eksportowane, po czym polecenie kończy się błędem. `--watch` obserwuje każdy dopasowany dokument; dokument utworzony po uruchomieniu obserwacji wymaga ponownego uruchomienia polecenia.

Tytuły historyjek pochodzą z nazwy pliku dokumentu, a gdy komponenty są na więcej niż jednej stronie, także ze strony: `pricing.fig` daje `pricing/Plan picker`, więc dokumenty eksportowane razem nie mieszają swoich historyjek. Każdy wariant zestawu komponentów staje się historyjką, a jego właściwości wariantów kontrolkami `select`, więc zmiana kontrolki pokazuje odpowiedni wariant. Zestaw z zachowaniem dostaje zamiast tego właściwości samej kontrolki: Switch lub Checkbox ma wartość logiczną `checked`, Toggle `pressed`, Collapsible `open`, a `disabled`, gdy zestaw rysuje stan wyłączony; najechanie, wciśnięcie i fokus pozostają osobnymi historyjkami. Samodzielne komponenty nazwane z ukośnikami, takie jak `Button/Primary` i `Button/Secondary`, trafiają do jednego pliku `Button` z kontrolką `Variant`. Kombinacja, dla której projekt nie ma wariantu, zgłasza w Storybooku nazwany błąd zamiast pokazywać inny wariant.

Historyjki renderują komponent jako HTML ze stylami wbudowanymi, tak jak `-f html`, więc nie potrzebują środowiska Pairdraw; `--framework` (`react`, `vue` lub `html`) zmienia tylko opakowanie oraz import `Meta`/`StoryObj` z `@storybook/react-vite`, `@storybook/vue3-vite` lub `@storybook/html-vite`. Tekst używa rodzin czcionek dokumentu: eksport pobiera ich pliki od dostawców czcionek internetowych używanych przez edytor do `pairdraw/<document>/` wraz z `fonts.css`, który importuje każdy plik historyjek, więc historyjki od początku rysują tymi czcionkami, nigdy najpierw zastępczymi. Trafiają tam też zmienne projektu dokumentu, jako niestandardowe właściwości w `tokens.css` importowanym przez każdy plik historyjek, więc style powiązane ze zmiennymi rozwiązują się tak, jak rysuje je projekt. Rodzina, której nie ma żaden dostawca, na przykład Menlo, przechodzi na czcionki przeglądarki, o czym eksport ostrzega; `--fonts none` nie dołącza plików czcionek. Historyjki statyczne nie eksportują jeszcze właściwości tekstowych, logicznych ani podmiany instancji.

Z `--framework vue` lub `--framework react` każdy zestaw komponentów i samodzielny komponent staje się zamiast tego prawdziwym komponentem: `<Name>.vue` lub `<Name>.tsx` z `<Name>.module.css` (z `--css tailwind` klasy narzędziowe Tailwind w znacznikach, a stany jako warianty, na przykład `data-[state=checked]:`, dla projektu budującego Tailwind v4). Wyjątkiem są komponenty nazwane z ukośnikami, zgrupowane w jednym pliku, oraz te, dla których reguła ustawia `"generate": false` — zachowują historyjki statyczne. Komponent bez zachowania składa się z elementów samego projektu: jego korzeniem jest element, który rysuje projekt, `div` dla ramki, i przyjmuje własne właściwości elementu głównego, takie jak `onClick` i `class`. Jego właściwości wariantów to właściwości ustawiane jako atrybuty `data-*`, więc wariant `State=hover` jest właściwością jak każda inna; właściwości logiczne to właściwości logiczne, które pokazują lub ukrywają powiązane z nimi warstwy; a właściwości slotów to treść pokazywana zamiast treści projektu — nazwany `<slot>` w Vue i właściwość `ReactNode` w React, z treścią projektu jako wartością zastępczą. Komponent, którego zachowaniem jest Button, Switch, Checkbox, Toggle, Collapsible, Tabs, Radio group, Toggle group, Accordion, Slider, Progress, Number field, Text field lub Textarea, jest budowany na Reka UI albo na pakiecie `radix-ui` z Radix UI, a jego stany interakcji, takie jak najechanie i wyłączenie, stają się prawdziwymi stylami `:hover` i `data-disabled`. Jego warianty są kompilowane do arkusza stylów opartego na stanach ustawianych przez Reka i Radix (`data-state`, `data-disabled`, najechanie i fokus), a każda inna właściwość wariantu jest właściwością ustawianą przez komponent jako atrybut `data-*`. W Vue jego wartość to `v-model`, na przykład `checked` lub `open`; w React komponent przyjmuje właściwości korzenia Radix, takie jak `checked`, `defaultChecked` i `onCheckedChange`. Jego właściwości tekstowe to właściwości typu string, domyślnie ze słowami z projektu, rysowane przez powiązane z nimi warstwy, z kontrolką tekstu w historyjkach.

Tabs przyjmują otwartą kartę jako `value` (`v-model:value` albo `defaultValue` i `onValueChange` w React), nazwaną według słów każdego wyzwalacza zapisanych jako slug, na przykład `account` lub `password`, i zaczynają od pierwszej; każdy wyzwalacz i jego panel to części `Tabs` z Reka lub Radix wokół warstw projektu, każdy wyzwalacz jest rysowany jak inne wyzwalacze projektu i przyjmuje wygląd pierwszego, gdy jego karta jest aktywna, a historyjki dostają kontrolkę `select` i historyjkę dla każdej karty. Radio group, Toggle group lub Accordion zapisuje dwa komponenty: grupę, która wybiera jeden element w ten sam sposób, zaczynając od elementu włączonego w projekcie, oraz `<Group>Item` z zestawu komponentów jej elementów, zbudowany jako element grupy (`RadioGroupItem`, `ToggleGroupItem` albo `AccordionItem` z wyzwalaczem w nagłówku) i przyjmujący `value`, które reprezentuje. Grupa używa go raz na element w slocie elementów, z wartością każdego elementu, nazwaną według właściwości etykiety albo słów, i jego wartościami tekstowymi. Slider, Progress lub Number field wiąże swoją liczbę jako `value` (`v-model:value` albo `defaultValue` w React, lista w przypadku suwaka Radix) w zakresie ustalonym przez zachowanie, zaczynając tam, gdzie projekt; zakres i uchwyt suwaka oraz wskaźnik postępu pomijają miejsce, w którym rysuje je projekt, bo ustala je wartość, a historyjki dostają kontrolkę zakresu i historyjkę na każdym końcu. Text field lub Textarea rysuje swoją warstwę tekstową jako natywne `input` lub `textarea` wiążące `value`, które w React przyjmuje właściwości komponentu; gdy projekt rysuje pole wypełnione i puste, słowa pustego pola stają się podpowiedzią, a jego wygląd wyglądem podpowiedzi, natomiast wygląd wypełniony jest widoczny, gdy pole zawiera tekst. W Vue pole liczbowe Reka UI rysuje pole i przyciski krokowe; Radix go nie ma, więc w React jest to natywne pole liczbowe, którego przyciski zmieniają wartość o krok i które po opuszczeniu wraca do swojego zakresu. Fokus na uchwycie suwaka lub polu tekstowym rysuje stan fokusu kontrolki. Radio jest generowane tylko jako element grupy; Toggle lub Collapsible użyte samodzielnie nadal stają się własnymi komponentami.

Wewnątrz wygenerowanego komponentu instancja innego komponentu wygenerowanego w tym samym eksporcie używa tego komponentu zamiast rysować jego warstwy: `<Switch>` importowany z `./Switch.vue` lub `./Switch`, ustawiony na wariant, tekst i wartość `disabled`, które pokazuje instancja. Kontrolka, którą projekt rysuje jako włączoną, na przykład zaznaczony przełącznik, zaczyna jako włączona i pozostaje obsługiwalna: lokalny `ref` wiązany przez `v-model` w Vue, `defaultChecked` w React. Rodzic tylko ją umieszcza, więc kontrolka zachowuje własny wygląd i style stanów. Komponentu używa tylko instancja, która rysuje się dokładnie jak jej wariant, poza wartościami właściwości i miejscem nadanym przez rodzica; instancja ze zmienionym tekstem, którego nie ustawia żadna właściwość, z własnym wypełnieniem lub innymi zmianami rysuje własne warstwy, więc historyjka zachowuje to, co pokazuje projekt. Instancje komponentów nieeksportowanych lub eksportowanych tylko jako historyjki statyczne są rysowane jak dotąd. Właściwość wariantu, której wartość domyślną dokument pozostawia pustą, zaczyna od wariantu domyślnego, czyli tego w lewym górnym rogu zestawu, od którego zaczynają się jego historyjki. Ikona umieszczona z zestawu, o ile jej ścieżki nie były edytowane, to komponent Iconify, `<Icon icon="lucide:bell">` z `@iconify/vue` lub `@iconify/react`, który wczytuje ikonę przy wyświetleniu.

Warstwa wypełniona shaderem odtwarza go za swoją treścią za pomocą `<Shader>` z biblioteki `shaders` (`shaders/vue` lub `shaders/react`), z każdym efektem jako elementem potomnym z właściwościami presetu i wyłączoną telemetrią (`disableTelemetry`); przeglądarki bez WebGPU nie pokazują w tym miejscu niczego.

Historyjki renderują komponent, a funkcja `play` klika kontrolkę i sprawdza jej stan, więc projekt Storybook potrzebuje zainstalowanego `reka-ui` lub `radix-ui`, a także `@iconify/vue` lub `@iconify/react`, gdy komponenty zawierają ikony, oraz `shaders`, gdy warstwy są wypełnione shaderami.

Historyjki zawierają wpisy `parameters.design` dla [`@storybook/addon-designs`](https://github.com/storybookjs/addon-designs):

- **Pairdraw** — gdy ścieżka dokumentu leży w bieżącym katalogu, [odnośnik `pairdraw://`](../index#url-scheme), który otwiera dokument w aplikacji na komputer i zaznacza wariant albo jego zestaw komponentów, gdy inna warstwa ma taką samą nazwę jak wariant. Schemat adresuje warstwy po nazwie, więc historyjka, której nazwy wariantu i komponentu są współdzielone z innymi warstwami, nie dostaje odnośnika.
- **Design** — obraz PNG wariantu w skali 2×, zapisany w `<Name>.design/` obok historyjki i wskazany przez `new URL(…, import.meta.url)`, dzięki czemu Vite dołącza go do paczki. Skopiuj ten parametr do historyjki własnego komponentu, aby porównać implementację z projektem. `--no-design-images` pomija renderowanie; zastępowanie czcionek podlega `--font-policy`, tak jak w eksporcie rastrowym.

`-o` wskazuje katalog wyjściowy. Znajdujący się tam manifest `.pairdraw-stories.json` zapisuje, który dokument (jako ścieżkę względną względem katalogu wyjściowego) i która strona wygenerowały każdą historyjkę i obraz projektu; zatwierdzaj go razem z historyjkami. Eksport zastępuje pliki wygenerowane tam wcześniej z tego samego dokumentu, także dla komponentów usuniętych lub przemianowanych od tego czasu; z `--page` tylko pliki tej strony. Przed jakąkolwiek zmianą odmawia nadpisania każdego innego pliku — ręcznie napisanej historyjki, historyjki innego dokumentu lub zbłąkanego obrazu. Eksport jednej strony, w którym nazwy plików przesunęły się na historyjki innej strony, wymaga pełnego eksportu. Bez manifestu istniejące historyjki są traktowane jak cudze, więc usuń je przed ponownym eksportem. `--watch` utrzymuje działanie polecenia i ponawia eksport po każdym zapisie dokumentu, dzięki czemu gorące przeładowanie Storybooka podąża za projektem; zapis, którego nie da się odczytać, jest zgłaszany, a obserwacja trwa dalej. Brakująca strona z `--page` lub zamiennik czcionki przy `--font-policy strict` nadal kończą polecenie.

## Eksport z uruchomionej aplikacji

Pomiń plik, aby eksportować z uruchomionej aplikacji:

```sh
pairdraw export -f png                       # export the selection in the active document
pairdraw export --page "Components" -f png   # export every layer of a page
pairdraw export --node 1:23 -f png           # export one layer, on any page
```

`--page` przyjmuje nazwę strony, a `--page-id` identyfikator strony z `pairdraw documents list`; oba eksportują tę stronę bez przełączania na nią aplikacji. Dodaj `--document-id`, aby eksportować z dokumentu innego niż aktywny.

Tryb pracy z aplikacją obsługuje PNG, JPG, WEBP, SVG i PDF. Eksport do PowerPoint, JSX, HTML, Storybook i `.fig` wymaga podania pliku. Eksport miniatury w trybie plikowym nie jest obecnie obsługiwany.
