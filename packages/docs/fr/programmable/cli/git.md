---
title: Versionner des designs avec Git
description: Configurer Git pour afficher des diffs lisibles des fichiers .fig avec openpencil diff files, un plan textconv et git difftool.
---

# Versionner des designs avec Git

Un fichier `.fig` est binaire : `git diff` et `git log -p` indiquent seulement qu'il a changé. Avec la CLI `openpencil` installée, Git peut montrer ce qui a changé : [`openpencil diff files`](/programmable/cli/comparing#comparing-documents) compare deux versions page par page et affiche les modifications sous forme de patch.

Il existe trois façons de l'intégrer. Les commandes ci-dessous configurent le dépôt courant ; ajoutez `--global` à `git config` pour configurer tous les dépôts.

| Configuration | Utilisée par | Affiche |
| --- | --- | --- |
| [Pilote de diff](#diff-driver) | `git diff` ; `git log -p` et `git show` avec `--ext-diff` | le patch qu'affiche `diff files` |
| [Textconv](#textconv) | `git log -p` et `git show` ; `git diff` sans pilote de diff | un diff ligne à ligne d'un plan des calques |
| [Difftool](#difftool) | `git difftool` | le patch, un fichier à la fois |

Les trois partent d'une entrée de `.gitattributes`, à la racine du dépôt, qui donne aux fichiers `.fig` un pilote de diff nommé `fig` :

```text
*.fig diff=fig
```

## Pilote de diff {#diff-driver}

Git lance la commande d'un pilote de diff avec sept arguments, `path old-file old-hex old-mode new-file new-hex new-mode`, et considère tout code de sortie autre que 0 comme un échec. `diff files` prend deux documents et, comme `diff(1)`, sort avec 1 quand ils diffèrent : un court script fait donc l'intermédiaire. Enregistrez-le sous le nom `git-diff-fig` dans un dossier de votre `PATH` et rendez-le exécutable :

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

`git diff` affiche maintenant le patch de chaque fichier `.fig` modifié. Après un titre plus grand et un nouveau texte dans la Card du [tutoriel design system](/fr/user-guide/design-system), il commence ainsi :

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

`git log` et `git show` n'utilisent un pilote de diff que sur demande, par exemple `git log -p --ext-diff -- design.fig`. Le patch est celui que décrit [Comparer des designs](/programmable/cli/comparing#patches) : chaque bloc nomme un calque par son chemin et par son ID dans l'ancienne version, si bien que `openpencil diff apply` peut appliquer le patch à cette version. Une page présente dans une seule version est signalée sur stderr.

## Textconv {#textconv}

Une commande textconv transforme une version d'un fichier en texte, que Git compare ligne à ligne. C'est ce qu'utilisent par défaut `git log -p` et `git show`, et Git peut la mettre en cache pour chaque version. Ce script affiche un plan de chaque page, un calque par ligne, avec son type, son nom, sa taille et son texte. Il utilise [`openpencil eval`](./scripting) et [`jq`](https://jqlang.org) ; enregistrez-le sous le nom `fig-textconv` dans votre `PATH` :

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

La même modification dans le plan :

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

Si la `command` du pilote de diff est aussi définie, `git diff` utilise la commande, et le plan apparaît dans `git log -p` et partout où `--no-ext-diff` est indiqué. Adaptez le script à ce que votre équipe relit, comme les remplissages ou les propriétés de composant ; un plan stable donne un diff lisible. `cachetextconv` garde le plan de chaque version dans les notes de Git, si bien qu'un gros fichier n'est lu qu'une fois.

## Difftool {#difftool}

`git difftool` lance un outil une fois par fichier modifié et laisse `git diff` tel quel. Définissez un outil qui lance `diff files` sur les deux versions :

```sh
git config difftool.openpencil.cmd 'openpencil diff files "$LOCAL" "$REMOTE"'
```

```sh
git difftool --no-prompt --tool=openpencil HEAD~1 -- '*.fig'
git difftool -y -t openpencil main...my-branch -- design.fig
```

Le filtre de chemins écarte les autres fichiers. Un pilote de diff défini par `diff.fig.command` l'emporte sur un difftool pour les fichiers `.fig` : utilisez l'un ou l'autre. N'ajoutez pas `--trust-exit-code` : `diff files` sort avec 1 dès que les versions diffèrent.

## Remarques

- La CLI lit chaque version qu'elle compare : comparer un gros fichier prend autant de temps que de l'ouvrir deux fois sans interface. `cachetextconv` épargne ce temps pour les versions déjà vues.
- Les calques sont appariés d'une version à l'autre par leur chemin de noms : un calque renommé apparaît comme supprimé puis ajouté.
- Les fichiers `.pen` sont du JSON, que Git compare déjà comme du texte.
