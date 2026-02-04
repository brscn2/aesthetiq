#!/usr/bin/env python3
"""
Output guardrail check: load (prompt, response) pairs from attack_scripts/attacks/output/toxic_pairs.json,
call get_safety_guardrails().check_output(prompt, response) with guardrails ON; assert
expected-toxic pairs are blocked (is_safe == False).

No backend, no auth: runs entirely in-process. Do not send requests to the NestJS
backend; no authentication token required. Use for defensive evaluation only.

Run: cd python_engine/conversational_agent && PYTHONPATH=. python attack_scripts/check_output_guardrails.py
"""
import sys
import json
from pathlib import Path

# Add app root so imports work
SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from app.guardrails import get_safety_guardrails


TOXIC_PAIRS_PATH = SCRIPT_DIR / "attacks" / "output" / "toxic_pairs.json"


def load_toxic_pairs():
    """Load list of {prompt, response} from toxic_pairs.json."""
    if not TOXIC_PAIRS_PATH.exists():
        return []
    with open(TOXIC_PAIRS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def main():
    pairs = load_toxic_pairs()
    if not pairs:
        print("No toxic pairs found at attack_scripts/attacks/output/toxic_pairs.json")
        return 1

    guardrails = get_safety_guardrails()
    passed = 0
    failed = 0
    for i, item in enumerate(pairs):
        prompt = item.get("prompt", "")
        response = item.get("response", "")
        result = guardrails.check_output(prompt, response)
        if not result.is_safe:
            print(f"PASS (blocked) #{i+1}: prompt={prompt[:30]}... response={response[:40]}...")
            passed += 1
        else:
            print(f"FAIL (not blocked) #{i+1}: prompt={prompt[:30]}... response={response[:40]}...")
            failed += 1

    print(f"\nOutput guardrail check: {passed}/{len(pairs)} blocked, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
