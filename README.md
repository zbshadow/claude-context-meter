# claude-context-meter

A Claude Code plugin that displays a persistent context window usage meter in the status line.

After every API response you'll see something like:

```
Context: 24k (18%)
```

Color-coded by pressure: green below 70k tokens, yellow 70k–100k, red above 100k (with a `/compact` suggestion).

## Requirements

- Claude Code
- Python 3 (standard library only — no pip installs required)

## Installation

1. Copy this plugin directory to your Claude Code plugins directory:

   ```
   cp -r claude-context-meter ~/.claude/plugins/claude-context-meter
   ```

2. Add the status line command to your Claude Code settings (`~/.claude/settings.json`):

   ```json
   {
     "statusLine": "python3 ~/.claude/plugins/claude-context-meter/context_meter.py"
   }
   ```

3. Start a new Claude Code session — the status line will appear immediately.

## Running tests

```
python3 -m unittest discover -s tests -v
```
