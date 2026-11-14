---
title: Versionare i design con Git
description: Configurare Git per mostrare diff leggibili dei file .fig con pairdraw diff files, uno schema textconv e git difftool.
---

# Versionare i design con Git

Un file `.fig` è binario, quindi `git diff` e `git log -p` segnalano solo che è cambiato. Con la CLI `pairdraw` installata, Git può mostrare cosa è cambiato: [`pairdraw diff files`](/programmable/cli/comparing#comparing-documents) confronta due versioni pagina per pagina e stampa le modifiche come patch.

Ci sono tre modi per collegarlo. I comandi qui sotto configurano il repository corrente; aggiungi `--global` a `git config` per configurare tutti i repository.

| Configurazione | Usata da | Mostra |
| --- | --- | --- |
| [Driver di diff](#diff-driver) | `git diff`; `git log -p` e `git show` con `--ext-diff` | la patch che stampa `diff files` |
| [Textconv](#textconv) | `git log -p` e `git show`; `git diff` quando non c'è un driver di diff | un diff riga per riga di uno schema dei livelli |
| [Difftool](#difftool) | `git difftool` | la patch, un file alla volta |

Tutti e tre partono da una voce di `.gitattributes`, nella radice del repository, che assegna ai file `.fig` un driver di diff chiamato `fig`:

```text
*.fig diff=fig
```

## Driver di diff {#diff-driver}

Git esegue il comando di un driver di diff con sette argomenti, `path old-file old-hex old-mode new-file new-hex new-mode`, e considera un errore qualsiasi stato diverso da 0. `diff files` riceve due documenti e, come `diff(1)`, esce con 1 quando sono diversi, quindi uno script breve fa da tramite. Salvalo come `git-diff-fig` in una cartella del tuo `PATH` e rendilo eseguibile:

```sh
#!/bin/sh
# Git runs an external diff driver as: path old-file old-hex old-mode new-file new-hex new-mode
path=$1
old=$2
new=$5

echo "diff --pairdraw a/$path b/$path"
if [ "$old" = /dev/null ]; then
  echo "new file"
  exit 0
fi
if [ "$new" = /dev/null ]; then
  echo "deleted file"
  exit 0
fi

pairdraw diff files "$old" "$new"
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

Ora `git diff` stampa la patch di ogni file `.fig` modificato. Dopo un titolo più grande e un nuovo testo nella Card del [tutorial sul design system](/it/user-guide/design-system), inizia così:

```diff
diff --pairdraw a/design-system.fig b/design-system.fig
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

`git log` e `git show` usano un driver di diff solo se richiesto, come in `git log -p --ext-diff -- design.fig`. La patch è quella descritta in [Confronto dei design](/programmable/cli/comparing#patches): ogni blocco indica un livello con il suo percorso e con il suo ID nella versione precedente, così `pairdraw diff apply` può applicare la patch a quella versione. Una pagina presente in una sola versione viene segnalata su stderr.

## Textconv {#textconv}

Un comando textconv trasforma una versione di un file in testo, e Git confronta quel testo riga per riga. È ciò che `git log -p` e `git show` usano per impostazione predefinita, e Git può memorizzarlo nella cache per ogni versione. Questo script stampa uno schema di ogni pagina, un livello per riga, con tipo, nome, dimensioni e testo. Usa [`pairdraw eval`](./scripting) e [`jq`](https://jqlang.org); salvalo come `fig-textconv` nel tuo `PATH`:

```sh
#!/bin/sh
# Print a document as an outline of its layers, one per line, for Git's textconv.
pairdraw eval "$1" --json --code '
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

La stessa modifica nello schema:

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

Se è impostato anche il `command` del driver di diff, `git diff` usa il comando, e lo schema compare in `git log -p` e ovunque sia indicato `--no-ext-diff`. Modifica lo script perché stampi ciò che il tuo team rivede, come riempimenti o proprietà dei componenti; uno schema stabile produce un diff leggibile. `cachetextconv` conserva lo schema di ogni versione nelle note di Git, così un file grande viene letto una sola volta.

## Difftool {#difftool}

`git difftool` esegue uno strumento una volta per ogni file modificato e lascia `git diff` com'è. Definisci uno strumento che esegua `diff files` sulle due versioni:

```sh
git config difftool.pairdraw.cmd 'pairdraw diff files "$LOCAL" "$REMOTE"'
```

```sh
git difftool --no-prompt --tool=pairdraw HEAD~1 -- '*.fig'
git difftool -y -t pairdraw main...my-branch -- design.fig
```

Il filtro dei percorsi esclude gli altri file. Un driver di diff impostato con `diff.fig.command` ha la precedenza su un difftool per i file `.fig`, quindi usa l'uno o l'altro. Non usare `--trust-exit-code`: `diff files` esce con 1 ogni volta che le versioni sono diverse.

## Note

- La CLI legge ogni versione che confronta, quindi il diff di un file grande richiede il tempo di aprirlo due volte senza interfaccia. `cachetextconv` risparmia quel tempo per le versioni già viste.
- I livelli vengono abbinati tra le versioni in base al percorso dei nomi, quindi un livello rinominato appare come rimosso e aggiunto.
- I file `.pen` sono JSON, quindi Git li confronta già come testo.
