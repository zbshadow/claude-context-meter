# claude-context-meter

A Claude Code plugin that adds a persistent context window usage meter to the status line. After every API response you'll see something like:

```
Context: 24k (18%) · [GitHub/my-project/main]
```

Color-coded by pressure level:

| Zone   | Token range      | Context numbers | VCS segment         |
|--------|------------------|-----------------|---------------------|
| Green  | < 70,000         | Green           | Gray (clean) / Cyan (dirty) |
| Yellow | 70,000–100,000   | Yellow          | Gray (clean) / Cyan (dirty) |
| Red    | > 100,000        | Red             | Gray (clean) / Cyan (dirty) |

In the red zone a suggestion is appended:

```
Context: 112k (56%) · Consider /compact or /clear · [GitHub/my-project/main]
```

**VCS segment** — if you're inside a git repository, the current platform, repo, and branch are shown at the end of the line. The segment turns cyan with a `*` when there are uncommitted changes:

```
Context: 24k (18%) · [GitHub/my-project/main*]
```

The status line updates automatically — no polling or background process required.

## Installation

```sh
npx claude-context-meter install
```

This copies the plugin to `~/.claude/plugins/context-meter/` and updates `~/.claude/settings.json` automatically. Open a new Claude Code session to activate it.

## Uninstallation

```sh
npx claude-context-meter uninstall
```

This removes the plugin files and cleans up the `statusLine` entry from `~/.claude/settings.json`. Open a new Claude Code session to complete the removal.

## Prerequisites

- **Claude Code** (any version that supports the `statusLine` setting)
- **Node.js** ≥ 18 — already installed as part of Claude Code; no additional installation required

## Verifying the installation

After opening a new Claude Code session you should see a status line that reads:

```
Context: 0 (0%) · [GitHub/my-project/main]
```

Send any message to Claude. After the API response the token count and percentage will update. If the status line does not appear, check that:

- You opened a **new** Claude Code session after running the installer
- `~/.claude/settings.json` contains a `statusLine` entry pointing to the plugin

## Running tests

```sh
node --test tests/test_context_meter.js
```
