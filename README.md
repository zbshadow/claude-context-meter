# claude-context-meter

[![npm version](https://img.shields.io/npm/v/claude-context-meter)](https://www.npmjs.com/package/claude-context-meter)
[![npm downloads](https://img.shields.io/npm/dm/claude-context-meter)](https://www.npmjs.com/package/claude-context-meter)
[![license](https://img.shields.io/npm/l/claude-context-meter)](LICENSE)
[![node](https://img.shields.io/node/v/claude-context-meter)](package.json)

> Persistent context window meter for the Claude Code status line — shows model, token usage, and git state after every response.

```
Sonnet 4.6 · Context: 24k (18%) · [GitHub/my-project/main]
```

## Highlights

- **Model name** — shows the active model (e.g. `Sonnet 4.6`, `Opus 4.7`) at a glance
- **Color-coded pressure** — green → yellow → red as context fills up
- **Git awareness** — platform, repo, and branch; turns cyan with `*` on dirty working tree
- **Update notifications** — yellow prompt in the status line when a newer version is available
- **Zero overhead** — no polling, no background process; runs only when Claude Code updates the status line

## Installation

```sh
npx claude-context-meter install
```

Copies the plugin to `~/.claude/plugins/context-meter/` and wires up `~/.claude/settings.json`. Open a new Claude Code session to activate.

## Status line reference

### Zones

| Zone   | Token range    | Color  |
|--------|----------------|--------|
| Green  | < 70,000       | Green  |
| Yellow | 70,000–100,000 | Yellow |
| Red    | > 100,000      | Red    |

### Examples

Clean branch, green zone:
```
Sonnet 4.6 · Context: 24k (18%) · [GitHub/my-project/main]
```

Dirty working tree (uncommitted changes):
```
Sonnet 4.6 · Context: 24k (18%) · [GitHub/my-project/main*]
```

Red zone with compact suggestion:
```
Sonnet 4.6 · Context: 112k (56%) · Consider /compact or /clear · [GitHub/my-project/main]
```

Detached HEAD:
```
Sonnet 4.6 · Context: 24k (18%) · [GitHub/my-project] (HEAD detached at a3f9c12)
```

No git repository:
```
Sonnet 4.6 · Context: 24k (18%) · [No version control]
```

## Updating

When a newer version is on npm, a second line appears in the status bar:

```
New version available. Run: npx claude-context-meter@latest install
```

Run that command to update and redeploy in one step:

```sh
npx claude-context-meter@latest install
```

## Uninstallation

```sh
npx claude-context-meter uninstall
```

Removes plugin files and cleans up the `statusLine` entry from `~/.claude/settings.json`. Open a new Claude Code session to complete the removal.

## Prerequisites

- **Claude Code** — any version that supports the `statusLine` setting
- **Node.js ≥ 18** — bundled with Claude Code; no separate installation needed

## Development

```sh
node --test tests/test_context_meter.js
```
