#!/usr/bin/env python3
"""
Input guardrail check: run attack payloads from attack_scripts/attacks/input/* through
get_safety_guardrails().check_input() with guardrails ON; assert expected-unsafe
lines are blocked (is_safe == False).

No backend, no auth: runs entirely in-process. Do not send requests to the NestJS
backend; no authentication token required. Use for defensive evaluation only.

Run: cd python_engine/conversational_agent && PYTHONPATH=. python attack_scripts/check_input_guardrails.py
"""
import sys
import os
from pathlib import Path

# Add app root so imports work
SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from app.guardrails import get_safety_guardrails


ATTACKS_INPUT_DIR = SCRIPT_DIR / "attacks" / "input"


def load_attack_lines():
    """Load all attack lines from attack_scripts/attacks/input/*.txt (one payload per non-empty line)."""
    lines_by_category = {}
    if not ATTACKS_INPUT_DIR.exists():
        return lines_by_category
    for path in sorted(ATTACKS_INPUT_DIR.glob("*.txt")):
        category = path.stem
        lines = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    lines.append(line)
        if lines:
            lines_by_category[category] = lines
    return lines_by_category


def main():
    guardrails = get_safety_guardrails()
    lines_by_category = load_attack_lines()
    if not lines_by_category:
        print("No attack files found under attack_scripts/attacks/input/")
        return 1

    total = 0
    passed = 0
    failed = 0
    for category, lines in lines_by_category.items():
        for i, text in enumerate(lines):
            total += 1
            result = guardrails.check_input(text)
            preview = text[:60] + "..." if len(text) > 60 else text
            if not result.is_safe:
                print(f"PASS (blocked) [{category}] #{i+1}: {preview}")
                passed += 1
            else:
                print(f"FAIL (not blocked) [{category}] #{i+1}: {preview}")
                failed += 1

    print(f"\nInput guardrail check: {passed}/{total} blocked, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
