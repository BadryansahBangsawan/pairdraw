---
title: Versioning Designs with Git
description: Configure Git to show readable diffs of .fig files with pairdraw diff files, a textconv outline, and git difftool.
---

# Versioning Designs with Git

A `.fig` file is binary, so `git diff` and `git log -p` only report that it changed. With the `pairdraw` CLI installed, Git can show what changed instead: [`pairdraw diff files`](./comparing#comparing-documents) compares two versions page by page and prints the changes as a patch.

There are three ways to wire it in. The commands below configure the current repository; add `--global` to `git config` to configure every repository.

| Setup | Used by | Shows |
| --- | --- | --- |
| [Diff driver](#diff-driver) | `git diff`; `git log -p` and `git show` with `--ext-diff` | the patch `diff files` prints |
| [Textconv](#textconv) | `git log -p` and `git show`; `git diff` when no diff driver is set | a line diff of an outline of the layers |
| [Difftool](#difftool) | `git difftool` | the patch, one file at a time |

All three start from a `.gitattributes` entry at the root of the repository that gives `.fig` files a diff driver named `fig`:

```text
*.fig diff=fig
```

## Diff driver

Git runs a diff driver's command with seven arguments, `path old-file old-hex old-mode new-file new-hex new-mode`, and treats any status other than 0 as a failure. `diff files` takes two documents and exits with 1 when they differ, as `diff(1)` does, so a short script sits between them. Save it as `git-diff-fig` somewhere on your `PATH` and make it executable:

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

`git diff` now prints the patch for each changed `.fig` file. After a larger title and new body text in the Card of the [design system tutorial](/user-guide/design-system), it begins:

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

`git log` and `git show` use a diff driver only when asked, as `git log -p --ext-diff -- design.fig`. The patch is the one [Comparing Designs](./comparing#patches) describes: each hunk names a layer by its path and by its ID in the older version, so `pairdraw diff apply` can apply the patch to that version. A page only one version has is reported on stderr instead.

## Textconv

A textconv command turns one version of a file into text, and Git diffs that text line by line. It is what `git log -p` and `git show` use by default, and Git can cache it per version. This script prints an outline of every page, one layer per line, with its type, name, size, and text. It uses [`pairdraw eval`](./scripting) and [`jq`](https://jqlang.org); save it as `fig-textconv` on your `PATH`:

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

The same change in the outline:

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

When the diff driver's `command` is also set, `git diff` uses the command, and the outline appears in `git log -p` and wherever `--no-ext-diff` is given. Change the script to print what your team reviews, such as fills or component properties; a stable outline makes a readable diff. `cachetextconv` keeps each version's outline in Git's notes, so a large file is read once.

## Difftool

`git difftool` runs a tool once per changed file and leaves `git diff` as it is. Define a tool that runs `diff files` on the two versions:

```sh
git config difftool.pairdraw.cmd 'pairdraw diff files "$LOCAL" "$REMOTE"'
```

```sh
git difftool --no-prompt --tool=pairdraw HEAD~1 -- '*.fig'
git difftool -y -t pairdraw main...my-branch -- design.fig
```

The pathspec keeps other files out of it. A diff driver set with `diff.fig.command` takes precedence over a difftool for `.fig` files, so use one or the other. Leave out `--trust-exit-code`: `diff files` exits with 1 whenever the versions differ.

## Notes

- The CLI reads every version it compares, so diffing a large file takes as long as opening it twice headlessly. `cachetextconv` saves that for versions already seen.
- Layers match across versions by their name path, so a renamed layer shows as removed and added.
- `.pen` files are JSON, so Git already diffs them as text.
