---
title: Версии дизайнов в Git
description: Настройка Git для читаемых diff файлов .fig с помощью pairdraw diff files, структуры textconv и git difftool.
---

# Версии дизайнов в Git

Файл `.fig` двоичный, поэтому `git diff` и `git log -p` сообщают только, что он изменился. Если установлена CLI `pairdraw`, Git может показать, что именно изменилось: [`pairdraw diff files`](/programmable/cli/comparing#comparing-documents) сравнивает две версии постранично и выводит изменения в виде патча.

Подключить её можно тремя способами. Команды ниже настраивают текущий репозиторий; добавьте `--global` к `git config`, чтобы настроить все репозитории.

| Настройка | Где используется | Что показывает |
| --- | --- | --- |
| [Драйвер diff](#diff-driver) | `git diff`; `git log -p` и `git show` с `--ext-diff` | патч, который выводит `diff files` |
| [Textconv](#textconv) | `git log -p` и `git show`; `git diff`, если драйвер diff не задан | построчный diff структуры слоёв |
| [Difftool](#difftool) | `git difftool` | патч, по одному файлу |

Все три начинаются с записи в `.gitattributes` в корне репозитория, которая назначает файлам `.fig` драйвер diff с именем `fig`:

```text
*.fig diff=fig
```

## Драйвер diff {#diff-driver}

Git запускает команду драйвера diff с семью аргументами, `path old-file old-hex old-mode new-file new-hex new-mode`, и считает ошибкой любой код выхода, кроме 0. `diff files` принимает два документа и, как `diff(1)`, завершается с кодом 1, если они различаются, поэтому между ними нужен короткий скрипт. Сохраните его как `git-diff-fig` в каталоге из `PATH` и сделайте исполняемым:

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

Теперь `git diff` выводит патч для каждого изменённого файла `.fig`. После увеличения заголовка и нового текста в Card из [руководства по дизайн-системе](/ru/user-guide/design-system) он начинается так:

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

`git log` и `git show` используют драйвер diff только по запросу, например `git log -p --ext-diff -- design.fig`. Это тот же патч, что описан в разделе [Сравнение дизайнов](/programmable/cli/comparing#patches): каждый блок называет слой по пути и по его ID в старой версии, поэтому `pairdraw diff apply` может применить патч к этой версии. Страница, которая есть только в одной версии, выводится в stderr.

## Textconv {#textconv}

Команда textconv превращает одну версию файла в текст, а Git сравнивает этот текст построчно. Её по умолчанию используют `git log -p` и `git show`, и Git может кешировать результат для каждой версии. Этот скрипт выводит структуру каждой страницы, по одному слою в строке, с его типом, именем, размером и текстом. Он использует [`pairdraw eval`](./scripting) и [`jq`](https://jqlang.org); сохраните его как `fig-textconv` в `PATH`:

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

То же изменение в структуре:

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

Если задан и `command` драйвера diff, `git diff` использует команду, а структура появляется в `git log -p` и везде, где указан `--no-ext-diff`. Измените скрипт, чтобы он выводил то, что проверяет ваша команда, например заливки или свойства компонентов; стабильная структура даёт читаемый diff. `cachetextconv` хранит структуру каждой версии в заметках Git, поэтому большой файл читается один раз.

## Difftool {#difftool}

`git difftool` запускает инструмент по одному разу для каждого изменённого файла и не меняет поведение `git diff`. Определите инструмент, который запускает `diff files` для двух версий:

```sh
git config difftool.pairdraw.cmd 'pairdraw diff files "$LOCAL" "$REMOTE"'
```

```sh
git difftool --no-prompt --tool=pairdraw HEAD~1 -- '*.fig'
git difftool -y -t pairdraw main...my-branch -- design.fig
```

Спецификация путей исключает остальные файлы. Драйвер diff, заданный через `diff.fig.command`, имеет приоритет над difftool для файлов `.fig`, поэтому используйте что-то одно. Не указывайте `--trust-exit-code`: `diff files` завершается с кодом 1 всякий раз, когда версии различаются.

## Примечания

- CLI читает каждую сравниваемую версию, поэтому diff большого файла занимает столько же времени, сколько два его открытия без интерфейса. `cachetextconv` экономит это время для уже встречавшихся версий.
- Слои сопоставляются между версиями по пути из имён, поэтому переименованный слой отображается как удалённый и добавленный.
- Файлы `.pen` — это JSON, поэтому Git уже сравнивает их как текст.
