---
title: Versionar diseños con Git
description: Configura Git para mostrar diffs legibles de archivos .fig con openpencil diff files, un esquema textconv y git difftool.
---

# Versionar diseños con Git

Un archivo `.fig` es binario, así que `git diff` y `git log -p` solo indican que ha cambiado. Con la CLI `openpencil` instalada, Git puede mostrar qué ha cambiado: [`openpencil diff files`](/programmable/cli/comparing#comparing-documents) compara dos versiones página por página e imprime los cambios como un parche.

Hay tres formas de conectarlo. Los comandos de abajo configuran el repositorio actual; añade `--global` a `git config` para configurar todos los repositorios.

| Configuración | Lo usa | Muestra |
| --- | --- | --- |
| [Controlador de diff](#diff-driver) | `git diff`; `git log -p` y `git show` con `--ext-diff` | el parche que imprime `diff files` |
| [Textconv](#textconv) | `git log -p` y `git show`; `git diff` cuando no hay controlador de diff | un diff por líneas de un esquema de las capas |
| [Difftool](#difftool) | `git difftool` | el parche, un archivo cada vez |

Las tres empiezan con una entrada en `.gitattributes`, en la raíz del repositorio, que asigna a los archivos `.fig` un controlador de diff llamado `fig`:

```text
*.fig diff=fig
```

## Controlador de diff {#diff-driver}

Git ejecuta el comando de un controlador de diff con siete argumentos, `path old-file old-hex old-mode new-file new-hex new-mode`, y trata cualquier estado distinto de 0 como un fallo. `diff files` recibe dos documentos y, como `diff(1)`, termina con 1 cuando son distintos, así que un script corto hace de intermediario. Guárdalo como `git-diff-fig` en una carpeta de tu `PATH` y hazlo ejecutable:

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

Ahora `git diff` imprime el parche de cada archivo `.fig` modificado. Tras agrandar el título y cambiar el texto de la Card del [tutorial de sistema de diseño](/es/user-guide/design-system), empieza así:

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

`git log` y `git show` solo usan un controlador de diff si se les pide, como en `git log -p --ext-diff -- design.fig`. El parche es el que describe [Comparar diseños](/programmable/cli/comparing#patches): cada bloque nombra una capa por su ruta y por su ID en la versión anterior, así que `openpencil diff apply` puede aplicar el parche a esa versión. Una página que solo tiene una de las versiones se indica en stderr.

## Textconv {#textconv}

Un comando textconv convierte una versión de un archivo en texto, y Git compara ese texto línea por línea. Es lo que usan `git log -p` y `git show` de forma predeterminada, y Git puede guardarlo en caché para cada versión. Este script imprime un esquema de cada página, una capa por línea, con su tipo, nombre, tamaño y texto. Usa [`openpencil eval`](./scripting) y [`jq`](https://jqlang.org); guárdalo como `fig-textconv` en tu `PATH`:

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

El mismo cambio en el esquema:

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

Si además está definido el `command` del controlador de diff, `git diff` usa el comando, y el esquema aparece en `git log -p` y donde se indique `--no-ext-diff`. Cambia el script para que imprima lo que revisa tu equipo, como rellenos o propiedades de componente; un esquema estable da un diff legible. `cachetextconv` guarda el esquema de cada versión en las notas de Git, así que un archivo grande se lee una sola vez.

## Difftool {#difftool}

`git difftool` ejecuta una herramienta una vez por archivo modificado y deja `git diff` como está. Define una herramienta que ejecute `diff files` sobre las dos versiones:

```sh
git config difftool.openpencil.cmd 'openpencil diff files "$LOCAL" "$REMOTE"'
```

```sh
git difftool --no-prompt --tool=openpencil HEAD~1 -- '*.fig'
git difftool -y -t openpencil main...my-branch -- design.fig
```

La especificación de rutas deja fuera los demás archivos. Un controlador de diff definido con `diff.fig.command` tiene prioridad sobre un difftool para los archivos `.fig`, así que usa uno u otro. No uses `--trust-exit-code`: `diff files` termina con 1 siempre que las versiones son distintas.

## Notas

- La CLI lee cada versión que compara, así que comparar un archivo grande tarda lo mismo que abrirlo dos veces sin interfaz. `cachetextconv` ahorra ese tiempo para las versiones ya vistas.
- Las capas se emparejan entre versiones por su ruta de nombres, así que una capa renombrada aparece como eliminada y añadida.
- Los archivos `.pen` son JSON, así que Git ya los compara como texto.
