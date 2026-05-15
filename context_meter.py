#!/usr/bin/env python3
import sys
import json

GREEN = "\033[32m"
RESET = "\033[0m"

GREEN_THRESHOLD = 70_000
YELLOW_THRESHOLD = 100_000

YELLOW = "\033[33m"
RED = "\033[31m"


def format_tokens(count):
    if count >= 1_000_000:
        return f"{round(count / 1_000_000)}M"
    elif count >= 1_000:
        return f"{round(count / 1_000)}k"
    return str(count)


def classify(count):
    if count < GREEN_THRESHOLD:
        return "green"
    elif count <= YELLOW_THRESHOLD:
        return "yellow"
    return "red"


def parse_input(data):
    try:
        payload = json.loads(data)
        cw = payload.get("context_window", {})
        tokens = int(cw.get("total_input_tokens", 0) or 0)
        pct = float(cw.get("used_percentage", 0) or 0)
    except Exception:
        tokens, pct = 0, 0
    return tokens, pct


def render(tokens, pct):
    formatted = format_tokens(tokens)
    pct_int = round(pct)
    line = f"Context: {formatted} ({pct_int}%)"
    color = GREEN
    return f"{color}{line}{RESET}"


def main():
    data = sys.stdin.read()
    tokens, pct = parse_input(data)
    print(render(tokens, pct))


if __name__ == "__main__":
    main()
