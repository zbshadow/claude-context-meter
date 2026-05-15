import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from context_meter import format_tokens, parse_input, render

GREEN = "\033[32m"
RESET = "\033[0m"


class TestTokenFormatter(unittest.TestCase):
    def test_zero(self):
        self.assertEqual(format_tokens(0), "0")

    def test_sub_thousand(self):
        self.assertEqual(format_tokens(999), "999")

    def test_exactly_thousand(self):
        self.assertEqual(format_tokens(1000), "1k")

    def test_rounds_down(self):
        self.assertEqual(format_tokens(1499), "1k")

    def test_rounds_up(self):
        self.assertEqual(format_tokens(1500), "2k")

    def test_mid_thousands(self):
        self.assertEqual(format_tokens(24300), "24k")

    def test_exactly_million(self):
        self.assertEqual(format_tokens(1_000_000), "1M")

    def test_mid_million(self):
        self.assertEqual(format_tokens(1_200_000), "1M")


class TestJsonParser(unittest.TestCase):
    def _payload(self, tokens, pct):
        return json.dumps({
            "context_window": {
                "total_input_tokens": tokens,
                "used_percentage": pct,
            }
        })

    def test_well_formed(self):
        tokens, pct = parse_input(self._payload(24300, 18.3))
        self.assertEqual(tokens, 24300)
        self.assertAlmostEqual(pct, 18.3)

    def test_missing_tokens(self):
        data = json.dumps({"context_window": {"used_percentage": 10.0}})
        tokens, pct = parse_input(data)
        self.assertEqual(tokens, 0)
        self.assertAlmostEqual(pct, 10.0)

    def test_missing_pct(self):
        data = json.dumps({"context_window": {"total_input_tokens": 5000}})
        tokens, pct = parse_input(data)
        self.assertEqual(tokens, 5000)
        self.assertEqual(pct, 0)

    def test_empty_json(self):
        tokens, pct = parse_input("{}")
        self.assertEqual(tokens, 0)
        self.assertEqual(pct, 0)

    def test_malformed_json(self):
        tokens, pct = parse_input("not json at all")
        self.assertEqual(tokens, 0)
        self.assertEqual(pct, 0)


class TestRenderer(unittest.TestCase):
    def test_initial_state(self):
        result = render(0, 0)
        self.assertIn("Context: 0 (0%)", result)
        self.assertTrue(result.startswith(GREEN))
        self.assertTrue(result.endswith(RESET))

    def test_green_mid(self):
        result = render(24300, 18.0)
        self.assertIn("Context: 24k (18%)", result)
        self.assertTrue(result.startswith(GREEN))
        self.assertTrue(result.endswith(RESET))

    def test_percentage_rounds(self):
        result = render(24300, 18.3)
        self.assertIn("(18%)", result)

    def test_ansi_reset_present(self):
        result = render(1000, 5.0)
        self.assertIn(RESET, result)


if __name__ == "__main__":
    unittest.main()
