#!/usr/bin/env python3
"""
Single runner: runs check_input_guardrails, check_output_guardrails, and optionally
workflow comparison (--workflow). Prints summary (block counts, guardrails added value
if --workflow and results exist).

Guardrails-off is tested via run_workflow_attacks.py --phase model-only (real LLM).

Run: cd python_engine/conversational_agent && PYTHONPATH=. python attack_scripts/run_guardrails_tests.py [--workflow]
"""
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent


def run_script(name: str, *args: str) -> tuple[int, str]:
    """Run a script in this directory with PYTHONPATH=APP_ROOT; return (exit_code, output)."""
    env = {**os.environ, "PYTHONPATH": str(APP_ROOT)}
    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / name), *args],
        cwd=str(APP_ROOT),
        capture_output=True,
        text=True,
        env=env,
    )
    out = (result.stdout or "") + (result.stderr or "")
    return result.returncode, out


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Run all guardrail tests")
    parser.add_argument("--workflow", action="store_true", help="Also run workflow comparison (--compare) if results exist")
    args = parser.parse_args()

    failed = 0
    summaries = []

    # 1. Input guardrails
    code, out = run_script("check_input_guardrails.py")
    print(out)
    if code != 0:
        failed += 1
        summaries.append("check_input_guardrails: FAILED")
    else:
        for line in out.strip().split("\n"):
            if line.startswith("Input guardrail check:"):
                summaries.append(line)
                break

    # 2. Output guardrails
    code, out = run_script("check_output_guardrails.py")
    print(out)
    if code != 0:
        failed += 1
        summaries.append("check_output_guardrails: FAILED")
    else:
        for line in out.strip().split("\n"):
            if line.startswith("Output guardrail check:"):
                summaries.append(line)
                break

    # 3. Optional: workflow comparison
    if args.workflow:
        code, out = run_script("run_workflow_attacks.py", "--compare", "--output-dir", str(SCRIPT_DIR / "results"))
        print(out)
        if code != 0:
            summaries.append("workflow comparison: run --phase model-only and --phase guardrails-on first")
        else:
            for line in out.strip().split("\n"):
                if "Guardrails added value:" in line:
                    summaries.append(line)
                    break

    print("\n=== Summary ===")
    for s in summaries:
        print(s)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
