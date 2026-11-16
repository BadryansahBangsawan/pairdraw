# Unreleased changes

Each user-facing change adds its changelog bullets here instead of editing `CHANGELOG.md`, so two changes never touch the same file:

```
changes/<pull request or topic>/<category>.md
```

`<category>` is `breaking`, `added`, `changed`, `fixed`, `performance`, or `security`. A file holds one bulleted list, written as it will read in the changelog:

```md
- Text keeps a case, a link, and variable bindings for any range of its characters, as in Figma.
```

Name the folder after the pull request's number, or, for work pushed without a pull request, after its topic in lowercase kebab-case, such as `changes/omp-agent/`. `bun run check:changelog` validates the fragments as they will read once assembled, and fails on entries written under `## Unreleased` in `CHANGELOG.md`. At release, `bun run changelog:assemble` moves them under `## Unreleased` and deletes the folders; the release pass in `AGENTS.md` then curates the section.
