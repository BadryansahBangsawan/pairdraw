---
title: Wersjonowanie projektów w Git
description: Skonfiguruj Git tak, aby pokazywał czytelne różnice plików .fig za pomocą openpencil diff files, konspektu textconv i git difftool.
---

# Wersjonowanie projektów w Git

Plik `.fig` jest binarny, więc `git diff` i `git log -p` informują tylko, że się zmienił. Gdy zainstalowane jest CLI `openpencil`, Git może pokazać, co dokładnie się zmieniło: [`openpencil diff files`](/programmable/cli/comparing#comparing-documents) porównuje dwie wersje strona po stronie i wypisuje zmiany jako łatkę.

Można to podłączyć na trzy sposoby. Poniższe polecenia konfigurują bieżące repozytorium; dodaj `--global` do `git config`, aby skonfigurować wszystkie repozytoria.

| Konfiguracja | Używana przez | Pokazuje |
| --- | --- | --- |
| [Sterownik diff](#diff-driver) | `git diff`; `git log -p` i `git show` z `--ext-diff` | łatkę wypisaną przez `diff files` |
| [Textconv](#textconv) | `git log -p` i `git show`; `git diff`, gdy nie ustawiono sterownika diff | różnice wierszy w konspekcie warstw |
| [Difftool](#difftool) | `git difftool` | łatkę, po jednym pliku |

Wszystkie trzy zaczynają się od wpisu w `.gitattributes` w katalogu głównym repozytorium, który przypisuje plikom `.fig` sterownik diff o nazwie `fig`:

```text
*.fig diff=fig
```

## Sterownik diff {#diff-driver}

Git uruchamia polecenie sterownika diff z siedmioma argumentami, `path old-file old-hex old-mode new-file new-hex new-mode`, i traktuje każdy kod wyjścia inny niż 0 jako błąd. `diff files` przyjmuje dwa dokumenty i, tak jak `diff(1)`, kończy się kodem 1, gdy się różnią, więc pośredniczy między nimi krótki skrypt. Zapisz go jako `git-diff-fig` w katalogu ze swojej zmiennej `PATH` i nadaj mu prawo wykonywania:

```sh
#!/bin/sh
# Git runs an external diff driver as: path old-file old-hex old-mode new-file new-hex new-mode
path=$1
old=$2
new=$5

echo "diff --openpencil a/$path b/$path"
if [ "$old" = /dev/null ]; then
  echo "new file"
  exit 0
fi
if [ "$new" = /dev/null ]; then
  echo "deleted file"
  exit 0
fi

openpencil diff files "$old" "$new"
status=$?
# 1 means the documents differ; only 2, trouble, is passed on to Git.
if [ "$status" -eq 1 ]; then
  exit 0
fi
exit "$status"
```

```sh
chmod +x git-diff-fig
git config diff.fig.command git-diff-fig
```

Teraz `git diff` wypisuje łatkę dla każdego zmienionego pliku `.fig`. Po powiększeniu tytułu i zmianie tekstu w Card z [samouczka o design systemie](/pl/user-guide/design-system) zaczyna się ona tak:

```diff
diff --openpencil a/design-system.fig b/design-system.fig
@@ /Components/Card/Title #387261504:30
-size={18}
+size={20}
@@ /Components/Card/Content/Body #387261504:32
-text="Slots hold content that each card chooses for itself."
+text="Pick a plan that fits your team."
@@ /Examples/Light/Card/Title #0:4
-size={18}
+size={20}
```

`git log` i `git show` używają sterownika diff tylko na żądanie, na przykład `git log -p --ext-diff -- design.fig`. Łatka jest tą opisaną w [Porównywaniu projektów](/programmable/cli/comparing#patches): każdy fragment wskazuje warstwę jej ścieżką i identyfikatorem w starszej wersji, więc `openpencil diff apply` może zastosować łatkę do tej wersji. Strona, którą ma tylko jedna wersja, jest zgłaszana na stderr.

## Textconv {#textconv}

Polecenie textconv zamienia jedną wersję pliku na tekst, a Git porównuje ten tekst wiersz po wierszu. Z tego domyślnie korzystają `git log -p` i `git show`, a Git może zapisywać wynik w pamięci podręcznej dla każdej wersji. Ten skrypt wypisuje konspekt każdej strony, po jednej warstwie w wierszu, z jej typem, nazwą, rozmiarem i tekstem. Korzysta z [`openpencil eval`](./scripting) i [`jq`](https://jqlang.org); zapisz go jako `fig-textconv` w swojej zmiennej `PATH`:

```sh
#!/bin/sh
# Print a document as an outline of its layers, one per line, for Git's textconv.
openpencil eval "$1" --json --code '
  const lines = []
  const walk = (node, depth) => {
    const size = depth > 0 && "width" in node ? ` ${Math.round(node.width)}×${Math.round(node.height)}` : ""
    const text = node.type === "TEXT" ? ` ${JSON.stringify(node.characters)}` : ""
    lines.push(`${"  ".repeat(depth)}${node.type} ${JSON.stringify(node.name)}${size}${text}`)
    if ("children" in node) for (const child of node.children) walk(child, depth + 1)
  }
  for (const page of figma.root.children) walk(page, 0)
  return lines
' | jq -r '.[]'
```

```sh
chmod +x fig-textconv
git config diff.fig.textconv fig-textconv
git config diff.fig.cachetextconv true
```

Ta sama zmiana w konspekcie:

```diff
@@ -4,10 +4,10 @@ CANVAS "Components"
       TEXT "Label" 44×17 "Button"
     COMPONENT "Variant=Secondary" 76×37
       TEXT "Label" 44×17 "Button"
-  COMPONENT "Card" 320×173
-    TEXT "Title" 272×22 "Card title"
-    SLOT "Content" 272×34
-      TEXT "Body" 272×34 "Slots hold content that each card chooses for itself."
+  COMPONENT "Card" 320×158
+    TEXT "Title" 272×24 "Card title"
+    SLOT "Content" 272×17
+      TEXT "Body" 272×17 "Pick a plan that fits your team."
```

Gdy ustawione jest też `command` sterownika diff, `git diff` używa polecenia, a konspekt pojawia się w `git log -p` i wszędzie tam, gdzie podano `--no-ext-diff`. Zmień skrypt tak, aby wypisywał to, co przegląda Twój zespół, na przykład wypełnienia lub właściwości komponentów; stabilny konspekt daje czytelne różnice. `cachetextconv` przechowuje konspekt każdej wersji w notatkach Git, więc duży plik jest czytany tylko raz.

## Difftool {#difftool}

`git difftool` uruchamia narzędzie raz dla każdego zmienionego pliku i nie zmienia działania `git diff`. Zdefiniuj narzędzie, które uruchamia `diff files` dla obu wersji:

```sh
git config difftool.openpencil.cmd 'openpencil diff files "$LOCAL" "$REMOTE"'
```

```sh
git difftool --no-prompt --tool=openpencil HEAD~1 -- '*.fig'
git difftool -y -t openpencil main...my-branch -- design.fig
```

Specyfikacja ścieżek wyklucza inne pliki. Sterownik diff ustawiony przez `diff.fig.command` ma pierwszeństwo przed narzędziem difftool dla plików `.fig`, więc używaj jednego albo drugiego. Pomiń `--trust-exit-code`: `diff files` kończy się kodem 1 za każdym razem, gdy wersje się różnią.

## Uwagi

- CLI czyta każdą porównywaną wersję, więc porównanie dużego pliku trwa tyle, co dwukrotne otwarcie go bez interfejsu. `cachetextconv` oszczędza ten czas dla wersji już widzianych.
- Warstwy są dopasowywane między wersjami według ścieżki nazw, więc warstwa o zmienionej nazwie pojawia się jako usunięta i dodana.
- Pliki `.pen` to JSON, więc Git już porównuje je jako tekst.
