# claude-context-meter

A Claude Code plugin that adds a persistent context window usage meter to the status line. After every API response you'll see something like:

```
Context: 24k (18%)
```

Color-coded by pressure level:

| Color  | Token range       | Example output                                          |
|--------|-------------------|---------------------------------------------------------|
| Green  | < 70,000          | `Context: 24k (18%)`                                    |
| Yellow | 70,000 – 100,000  | `Context: 85k (43%)`                                    |
| Red    | > 100,000         | `Context: 112k (56%) · Consider /compact or /clear`     |

The status line updates automatically — no polling or background process required.

## Prerequisites

- **Claude Code** (any version that supports the `statusLine` setting)
- **Python 3** — verify with `python3 --version` (no third-party packages required)

## Installation

1. **Clone or download** this repository:

   ```sh
   git clone https://github.com/zbshadow/claude-context-meter.git
   ```

2. **Add the status line command** to your Claude Code user settings (`~/.claude/settings.json`).  
   If the file does not exist, create it.

   ```json
   {
     "statusLine": "python3 /path/to/claude-context-meter/context_meter.py"
   }
   ```

   Replace `/path/to/claude-context-meter` with the actual path where you cloned the repo.  
   Example: if you cloned into your home directory, use `~/claude-context-meter/context_meter.py`.

3. **Start a new Claude Code session** — the status line activates immediately before the first API call, showing `Context: 0 (0%)` in green.

## Verifying the installation

After opening a new Claude Code session you should see a status line at the bottom of the terminal that reads:

```
Context: 0 (0%)
```

Send any message to Claude. After the API response the token count and percentage will update to reflect the current session context. If the status line does not appear, check that:

- `~/.claude/settings.json` contains the `statusLine` key with the correct absolute path to `context_meter.py`
- `python3` is on your `PATH` (run `python3 --version` in the same terminal)
- You opened a **new** Claude Code session after editing `settings.json`

## Running tests

```sh
python3 -m unittest discover -s tests -v
```

All 26 tests should pass with no external dependencies.
