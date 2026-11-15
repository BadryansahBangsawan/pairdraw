---
title: Просмотр документов
description: Дерево объектов, поиск по имени и типу и просмотр свойств из терминала.
---

# Просмотр документов

CLI позволяет изучать документы дизайна без запуска редактора. Все команды работают и с открытым настольным приложением — достаточно не указывать файл.

::: tip Установка

```sh
npm install -g @pairdraw/cli
# или
bun add -g @pairdraw/cli
```

:::

## Общие сведения

Краткий обзор — количество страниц, общее число объектов, используемые шрифты и размер файла:

```sh
pairdraw info design.fig
```

## Диагностика шрифтов {#font-diagnostics}

Команда сообщает запрошенные начертания, доступные источники, замены и затронутые слои:

```sh
pairdraw fonts design.fig
pairdraw fonts design.fig --json
pairdraw fonts --document-id tab-123 --page-id 0:1
```

В режиме файла проверяются все страницы документа по шрифтам, доступным на компьютере с CLI, без загрузки онлайн-шрифтов. В режиме приложения проверяются выбранные документ и страница приложения, и загруженные там шрифты могут отличаться от шрифтов компьютера с CLI. Начертания получают статус `available`, `substituted` или `unresolved`; вывод JSON содержит `faithful`, `faces` и `issues`.

[Политики шрифтов при экспорте](./exporting#font-substitution-policy) позволяют предупреждать о заменах или отклонять их при растровом экспорте и экспорте в PDF из файла.

## Дерево объектов

Выводит всю иерархию объектов:

```sh
pairdraw tree design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

## Поиск объектов

По типу:

```sh
pairdraw find design.fig --type TEXT
```

По имени:

```sh
pairdraw find design.fig --name "Button"
```

Оба параметра можно сочетать, чтобы сузить результаты.

## Запросы XPath

Селекторы XPath находят объекты по типу, атрибутам и положению в дереве:

```sh
pairdraw query design.fig "//FRAME"
```

### Полезные шаблоны

**По типу:**

```sh
pairdraw query design.fig "//TEXT"                    # Все текстовые объекты
pairdraw query design.fig "//COMPONENT"               # Все компоненты
pairdraw query design.fig "//INSTANCE"                # Все экземпляры
```

**По атрибутам:**

```sh
pairdraw query design.fig "//FRAME[@width < 300]"                # Фреймы уже 300 пикселей
pairdraw query design.fig "//*[@cornerRadius > 0]"               # Скруглённые углы
pairdraw query design.fig "//*[@visible = false]"                # Скрытые объекты
pairdraw query design.fig "//TEXT[@fontSize >= 24]"              # Крупный текст
pairdraw query design.fig "//*[@opacity < 1]"                    # Полупрозрачные объекты
```

**По имени и текстовому содержимому:**

```sh
pairdraw query design.fig "//TEXT[contains(@name, 'Button')]"    # Имя содержит 'Button'
pairdraw query design.fig "//TEXT[contains(@text, 'Hello')]"     # Текст содержит 'Hello'
```

**По иерархии:**

```sh
pairdraw query design.fig "//SECTION//TEXT"            # Текст внутри секций
pairdraw query design.fig "//FRAME/TEXT"               # Непосредственные текстовые потомки фреймов
pairdraw query design.fig "//COMPONENT_SET//INSTANCE"  # Экземпляры внутри наборов компонентов
```

### Доступные атрибуты

`name`, `width`, `height`, `x`, `y`, `visible`, `opacity`, `cornerRadius`, `fontSize`, `fontFamily`, `fontWeight`, `layoutMode`, `itemSpacing`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `strokeWeight`, `rotation`, `locked`, `blendMode`, `text`, `lineHeight`, `letterSpacing`

### Пример вывода

```
  Found 5 nodes

[0] [frame] "Logo  92×32" (0:9)
[1] [frame] "logo-short-6  31×32" (0:10)
[2] [frame] "wrapper  128×73" (0:20)
[3] [frame] "pen-drawing  148×52" (0:21)
[4] [frame] "surprised-emoji  32×32" (0:26)
```

## Свойства объекта

Показывает все свойства объекта по его идентификатору:

```sh
pairdraw node design.fig --id 1:23
```

## Страницы

Список всех страниц документа:

```sh
pairdraw pages design.fig
```

## Переменные

Список переменных дизайна и их коллекций:

```sh
pairdraw variables design.fig
```

## Работа с открытым приложением

Если настольное приложение запущено, не указывайте файл: CLI подключится по RPC и будет работать с открытым холстом:

```sh
pairdraw documents list    # список ID открытых документов и страниц
pairdraw tree              # просмотр активного документа в приложении
pairdraw tree --document-id tab-123 --page-id 0:1
pairdraw eval --document-id tab-123 --page-id 0:1 -c "..."
```

В процессах с агентами сначала вызовите `pairdraw documents list --json`, а затем явно передавайте `--document-id` и `--page-id`, не полагаясь на видимую активную вкладку или страницу. Как открывать, сохранять, переключать и закрывать документы, отменять изменения, менять настройки и вызывать любые инструменты редактора, описано в разделе [Управление приложением](/programmable/cli/app-control).

## Проверка качества

Проверка документов на проблемы с именами, компоновкой, структурой и доступностью:

```sh
pairdraw lint design.fig
pairdraw lint design.pen --preset strict
pairdraw lint design.fig --rule color-contrast
pairdraw lint design.fig --list-rules
pairdraw lint design.fig --fix -o fixed.fig
```

Добавьте `--json`, чтобы получить машиночитаемый вывод: каждое сообщение содержит `fix` и `suggestions` в виде данных. `--fix` применяет безопасные исправления — привязывает цвета к подходящим переменным цвета и округляет геометрию до целых пикселей — и записывает результат в файл `.fig`, указанный в `-o`.

## Вывод JSON

Все команды поддерживают `--json` для машиночитаемого вывода — передавайте результат в `jq`, сценарии CI или другие программы:

```sh
pairdraw tree design.fig --json | jq '.[] | .name'
```
