---
title: Designs mit Git versionieren
description: Git so einrichten, dass es lesbare Diffs von .fig-Dateien zeigt, mit openpencil diff files, einer Textconv-Gliederung und git difftool.
---

# Designs mit Git versionieren

Eine `.fig`-Datei ist binär, daher melden `git diff` und `git log -p` nur, dass sie sich geändert hat. Ist die `openpencil`-CLI installiert, zeigt Git stattdessen, was sich geändert hat: [`openpencil diff files`](/programmable/cli/comparing#comparing-documents) vergleicht zwei Versionen Seite für Seite und gibt die Änderungen als Patch aus.

Es gibt drei Wege, das einzubinden. Die folgenden Befehle richten das aktuelle Repository ein; mit `--global` bei `git config` gilt die Einstellung für jedes Repository.

| Einrichtung | Verwendet von | Zeigt |
| --- | --- | --- |
| [Diff-Treiber](#diff-driver) | `git diff`; `git log -p` und `git show` mit `--ext-diff` | den Patch, den `diff files` ausgibt |
| [Textconv](#textconv) | `git log -p` und `git show`; `git diff`, wenn kein Diff-Treiber gesetzt ist | einen Zeilen-Diff einer Gliederung der Ebenen |
| [Difftool](#difftool) | `git difftool` | den Patch, eine Datei nach der anderen |

Alle drei beginnen mit einem Eintrag in `.gitattributes` im Wurzelverzeichnis des Repositorys, der `.fig`-Dateien einen Diff-Treiber namens `fig` gibt:

```text
*.fig diff=fig
```

## Diff-Treiber {#diff-driver}

Git ruft den Befehl eines Diff-Treibers mit sieben Argumenten auf, `path old-file old-hex old-mode new-file new-hex new-mode`, und wertet jeden Status außer 0 als Fehler. `diff files` nimmt zwei Dokumente und endet wie `diff(1)` mit 1, wenn sie sich unterscheiden. Deshalb sitzt ein kurzes Skript dazwischen. Speichern Sie es als `git-diff-fig` in einem Verzeichnis Ihres `PATH` und machen Sie es ausführbar:

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

`git diff` gibt nun für jede geänderte `.fig`-Datei den Patch aus. Nach einem größeren Titel und neuem Fließtext in der Card aus dem [Designsystem-Tutorial](/de/user-guide/design-system) beginnt er so:

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

`git log` und `git show` verwenden einen Diff-Treiber nur auf Anfrage, etwa `git log -p --ext-diff -- design.fig`. Der Patch ist der unter [Designs vergleichen](/programmable/cli/comparing#patches) beschriebene: Jeder Hunk nennt eine Ebene über ihren Pfad und ihre ID in der älteren Version, sodass `openpencil diff apply` den Patch auf diese Version anwenden kann. Eine Seite, die nur eine Version hat, wird stattdessen auf stderr gemeldet.

## Textconv {#textconv}

Ein Textconv-Befehl wandelt eine Version einer Datei in Text um, und Git vergleicht diesen Text Zeile für Zeile. `git log -p` und `git show` verwenden ihn standardmäßig, und Git kann ihn pro Version zwischenspeichern. Dieses Skript gibt eine Gliederung jeder Seite aus, eine Ebene pro Zeile, mit Typ, Name, Größe und Text. Es verwendet [`openpencil eval`](./scripting) und [`jq`](https://jqlang.org); speichern Sie es als `fig-textconv` in Ihrem `PATH`:

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

Dieselbe Änderung in der Gliederung:

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

Ist zusätzlich der `command` des Diff-Treibers gesetzt, verwendet `git diff` den Befehl, und die Gliederung erscheint in `git log -p` und überall dort, wo `--no-ext-diff` angegeben ist. Passen Sie das Skript an das an, was Ihr Team prüft, etwa Füllungen oder Komponenteneigenschaften; eine stabile Gliederung ergibt einen lesbaren Diff. `cachetextconv` legt die Gliederung jeder Version in Git-Notes ab, sodass eine große Datei nur einmal gelesen wird.

## Difftool {#difftool}

`git difftool` startet ein Werkzeug einmal pro geänderter Datei und lässt `git diff` unverändert. Definieren Sie ein Werkzeug, das `diff files` auf beide Versionen anwendet:

```sh
git config difftool.openpencil.cmd 'openpencil diff files "$LOCAL" "$REMOTE"'
```

```sh
git difftool --no-prompt --tool=openpencil HEAD~1 -- '*.fig'
git difftool -y -t openpencil main...my-branch -- design.fig
```

Die Pfadangabe hält andere Dateien heraus. Ein mit `diff.fig.command` gesetzter Diff-Treiber hat für `.fig`-Dateien Vorrang vor einem Difftool, verwenden Sie also das eine oder das andere. Lassen Sie `--trust-exit-code` weg: `diff files` endet mit 1, sobald sich die Versionen unterscheiden.

## Hinweise

- Die CLI liest jede Version, die sie vergleicht. Ein Diff einer großen Datei dauert daher so lange, wie sie zweimal ohne Oberfläche zu öffnen. `cachetextconv` spart das für bereits gesehene Versionen.
- Ebenen werden zwischen Versionen über ihren Namenspfad zugeordnet, daher erscheint eine umbenannte Ebene als entfernt und hinzugefügt.
- `.pen`-Dateien sind JSON, Git vergleicht sie also bereits als Text.
