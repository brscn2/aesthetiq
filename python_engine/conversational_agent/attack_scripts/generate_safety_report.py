#!/usr/bin/env python3
"""
Generate a single HTML safety report from guardrail test results.

Runs check_input_guardrails and check_output_guardrails (unless --no-run-layer-tests),
reads workflow_attacks_model_only.json and workflow_attacks_guardrails_on.json from
--results-dir, computes metrics, and writes a self-contained HTML report with
Chart.js visualizations.

Run: cd python_engine/conversational_agent && PYTHONPATH=. python attack_scripts/generate_safety_report.py [--results-dir attack_scripts/results] [--output attack_scripts/results/safety_report.html] [--no-run-layer-tests]
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent

# Default paths relative to script dir
DEFAULT_RESULTS_DIR = SCRIPT_DIR / "results"
DEFAULT_OUTPUT = SCRIPT_DIR / "results" / "safety_report.html"

# Parse layer test output: "Input guardrail check: 56/56 blocked, 0 failed"
INPUT_GUARDRAIL_RE = re.compile(
    r"Input guardrail check:\s*(\d+)/(\d+)\s+blocked,\s*(\d+)\s+failed"
)
OUTPUT_GUARDRAIL_RE = re.compile(
    r"Output guardrail check:\s*(\d+)/(\d+)\s+blocked,\s*(\d+)\s+failed"
)

# Max rows in comparison table (rest noted in report)
TABLE_ROW_LIMIT = 30


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


def run_layer_tests() -> dict[str, Any]:
    """
    Run check_input_guardrails and check_output_guardrails; parse stdout.
    Returns dict with input_guardrail: {total, blocked, failed}, output_guardrail: {total, blocked, failed}.
    """
    out: dict[str, Any] = {
        "input_guardrail": {"total": 0, "blocked": 0, "failed": 0},
        "output_guardrail": {"total": 0, "blocked": 0, "failed": 0},
    }

    code, text = run_script("check_input_guardrails.py")
    for line in text.splitlines():
        m = INPUT_GUARDRAIL_RE.search(line)
        if m:
            blocked, total, failed = int(m.group(1)), int(m.group(2)), int(m.group(3))
            out["input_guardrail"] = {"total": total, "blocked": blocked, "failed": failed}
            break

    code, text = run_script("check_output_guardrails.py")
    for line in text.splitlines():
        m = OUTPUT_GUARDRAIL_RE.search(line)
        if m:
            blocked, total, failed = int(m.group(1)), int(m.group(2)), int(m.group(3))
            out["output_guardrail"] = {"total": total, "blocked": blocked, "failed": failed}
            break

    return out


def load_workflow_results(results_dir: Path) -> tuple[list[dict] | None, list[dict] | None]:
    """Load workflow_attacks_model_only.json and workflow_attacks_guardrails_on.json. Returns (model_only, guardrails_on) or (None, None) for missing."""
    model_path = results_dir / "workflow_attacks_model_only.json"
    guard_path = results_dir / "workflow_attacks_guardrails_on.json"
    model_only: list[dict] | None = None
    guardrails_on: list[dict] | None = None
    if model_path.exists():
        with open(model_path, "r", encoding="utf-8") as f:
            model_only = json.load(f)
    if guard_path.exists():
        with open(guard_path, "r", encoding="utf-8") as f:
            guardrails_on = json.load(f)
    return model_only, guardrails_on


def compute_workflow_metrics(
    model_only: list[dict] | None, guardrails_on: list[dict] | None
) -> dict[str, Any]:
    """
    Compute block rates, blocked_by breakdown, outcome breakdown, guardrails added value,
    and list of attack_ids blocked by output_guardrail in workflow.
    """
    metrics: dict[str, Any] = {
        "has_workflow": False,
        "n_attacks": 0,
        "blocked_model_only": 0,
        "blocked_guardrails_on": 0,
        "guardrails_added_value": 0,
        "blocked_by_breakdown": {},  # guardrails_on: input_guardrail, output_guardrail, none
        "outcome_breakdown": {},  # model_only: refused_by_model, harmful_output, safe
        "output_guardrail_in_workflow_ids": [],
        "comparison_pairs": [],  # list of {attack_id, category, model_only: {response, blocked_by, outcome}, guardrails_on: {...}}
    }
    if not model_only or not guardrails_on or len(model_only) != len(guardrails_on):
        return metrics

    metrics["has_workflow"] = True
    n = len(model_only)
    metrics["n_attacks"] = n

    def blocked_or_refused(r: dict) -> bool:
        return r.get("blocked_by") != "none" or r.get("outcome") == "refused_by_model"

    metrics["blocked_model_only"] = sum(1 for r in model_only if blocked_or_refused(r))
    metrics["blocked_guardrails_on"] = sum(1 for r in guardrails_on if blocked_or_refused(r))
    metrics["guardrails_added_value"] = metrics["blocked_guardrails_on"] - metrics["blocked_model_only"]

    # blocked_by breakdown (guardrails_on)
    for r in guardrails_on:
        b = r.get("blocked_by") or "none"
        metrics["blocked_by_breakdown"][b] = metrics["blocked_by_breakdown"].get(b, 0) + 1
    # outcome breakdown (model_only)
    for r in model_only:
        o = r.get("outcome") or "safe"
        metrics["outcome_breakdown"][o] = metrics["outcome_breakdown"].get(o, 0) + 1

    # output_guardrail in workflow
    metrics["output_guardrail_in_workflow_ids"] = [
        r["attack_id"] for r in guardrails_on if r.get("blocked_by") == "output_guardrail"
    ]

    # comparison pairs (by attack_id order; assume same order in both lists)
    by_id_go = {r["attack_id"]: r for r in guardrails_on}
    for r in model_only:
        aid = r["attack_id"]
        go = by_id_go.get(aid, {})
        metrics["comparison_pairs"].append({
            "attack_id": aid,
            "category": r.get("attack_category", ""),
            "model_only": {
                "model_response": (r.get("model_response") or "")[:300],
                "blocked_by": r.get("blocked_by", "none"),
                "outcome": r.get("outcome", "safe"),
            },
            "guardrails_on": {
                "model_response": (go.get("model_response") or "")[:300],
                "blocked_by": go.get("blocked_by", "none"),
                "outcome": go.get("outcome", "safe"),
            },
        })

    return metrics


def build_html(
    layer: dict[str, Any],
    workflow_metrics: dict[str, Any],
    output_path: Path,
    results_dir: Path,
) -> None:
    """Build self-contained HTML with inline CSS and Chart.js (CDN)."""
    inp = layer["input_guardrail"]
    out = layer["output_guardrail"]
    inp_total = inp["total"] or 1
    out_total = out["total"] or 1
    inp_pct = round(100 * inp["blocked"] / inp_total, 1) if inp_total else 0
    out_pct = round(100 * out["blocked"] / out_total, 1) if out_total else 0

    has_wf = workflow_metrics["has_workflow"]
    n = workflow_metrics["n_attacks"]
    blocked_mo = workflow_metrics["blocked_model_only"]
    blocked_go = workflow_metrics["blocked_guardrails_on"]
    added = workflow_metrics["guardrails_added_value"]
    out_rail_wf_count = len(workflow_metrics["output_guardrail_in_workflow_ids"])
    comparison_pairs = workflow_metrics["comparison_pairs"][:TABLE_ROW_LIMIT]
    total_pairs = len(workflow_metrics["comparison_pairs"])
    blocked_by = workflow_metrics["blocked_by_breakdown"]
    outcome = workflow_metrics["outcome_breakdown"]

    # Chart.js data (JSON-safe)
    blocked_by_labels = list(blocked_by.keys()) if blocked_by else []
    blocked_by_data = list(blocked_by.values()) if blocked_by else []
    outcome_labels = list(outcome.keys()) if outcome else []
    outcome_data = list(outcome.values()) if outcome else []

    workflow_placeholder = ""
    if not has_wf:
        workflow_placeholder = """
        <p class="warning">Workflow comparison data missing. Run both phases first:</p>
        <pre>PYTHONPATH=. python attack_scripts/run_workflow_attacks.py --phase model-only --output-dir attack_scripts/results
PYTHONPATH=. python attack_scripts/run_workflow_attacks.py --phase guardrails-on --output-dir attack_scripts/results</pre>
        """

    comparison_table_rows = ""
    for p in comparison_pairs:
        mo = p["model_only"]
        go = p["guardrails_on"]
        comparison_table_rows += f"""
        <tr>
            <td>{p["attack_id"]}</td>
            <td>{_escape(p["category"])}</td>
            <td><span class="snippet">{_escape(mo["model_response"])}</span><br><small>{mo["blocked_by"]} / {mo["outcome"]}</small></td>
            <td><span class="snippet">{_escape(go["model_response"])}</span><br><small>{go["blocked_by"]} / {go["outcome"]}</small></td>
        </tr>"""
    if total_pairs > TABLE_ROW_LIMIT:
        comparison_table_rows += f'<tr><td colspan="4" class="note">First {TABLE_ROW_LIMIT} of {total_pairs} attacks shown. Full data in workflow_attacks_*.json.</td></tr>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guardrails and Safety Testing Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <style>
        :root {{ font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1a1a1a; background: #f8f9fa; }}
        body {{ max-width: 900px; margin: 0 auto; padding: 1.5rem; }}
        h1 {{ font-size: 1.5rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }}
        h2 {{ font-size: 1.2rem; margin-top: 1.5rem; }}
        .section {{ background: #fff; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}
        .cards {{ display: flex; flex-wrap: wrap; gap: 1rem; margin: 0.5rem 0; }}
        .card {{ background: #e8f4fd; border: 1px solid #b8daff; border-radius: 6px; padding: 0.75rem 1rem; min-width: 140px; }}
        .card strong {{ display: block; font-size: 1.1rem; }}
        .card .meta {{ font-size: 0.9rem; color: #555; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 0.9rem; }}
        th, td {{ border: 1px solid #ddd; padding: 0.5rem; text-align: left; }}
        th {{ background: #f0f0f0; }}
        .snippet {{ max-height: 4em; overflow: auto; display: block; }}
        small {{ color: #666; }}
        .warning {{ color: #856404; background: #fff3cd; padding: 0.5rem; border-radius: 4px; }}
        pre {{ background: #f5f5f5; padding: 0.75rem; overflow: auto; font-size: 0.85rem; }}
        .note {{ color: #666; font-style: italic; }}
        #chartBlockRate {{ max-height: 220px; }}
        .chart-wrap {{ max-width: 320px; margin: 1rem 0; }}
    </style>
</head>
<body>
    <h1>Guardrails and Safety Testing Report</h1>
    <p>Conversational agent safety evaluation. Tests run in-process only (no backend, no auth).</p>

    <div class="section">
        <h2>What we test</h2>
        <ul>
            <li><strong>Input guardrails</strong> — Prompt injection, jailbreaks, toxicity, obfuscation, and GPT-4.1-nano–targeted extreme scenarios (Plinny-style, involuntary jailbreak) from <code>attacks/input/*.txt</code>.</li>
            <li><strong>Output guardrails</strong> — Toxic prompt/response pairs from <code>attacks/output/toxic_pairs.json</code>; we expect the output guardrail to block them.</li>
            <li><strong>End-to-end</strong> — Same attacks sent through the workflow with guardrails off (model-only) vs on; we compare who blocked and the real model response.</li>
        </ul>
    </div>

    <div class="section">
        <h2>How we test</h2>
        <p>All tests run in-process: input check → optional LLM → output check when guardrails are on. Attack datasets are from <code>attacks/README.md</code> (OWASP, HackAPrompt, GPT-4.1-nano–targeted).</p>
    </div>

    <div class="section">
        <h2>Results</h2>

        <h3>Input guardrail (layer test)</h3>
        <div class="cards">
            <div class="card"><strong>{inp["blocked"]}/{inp["total"]}</strong> <span class="meta">blocked</span></div>
            <div class="card"><strong>{inp["failed"]}</strong> <span class="meta">failed</span></div>
            <div class="card"><strong>{inp_pct}%</strong> <span class="meta">pass rate</span></div>
        </div>

        <h3>Output guardrail (layer test)</h3>
        <div class="cards">
            <div class="card"><strong>{out["blocked"]}/{out["total"]}</strong> <span class="meta">blocked</span></div>
            <div class="card"><strong>{out["failed"]}</strong> <span class="meta">failed</span></div>
            <div class="card"><strong>{out_pct}%</strong> <span class="meta">pass rate</span></div>
        </div>

        <h3>Workflow comparison (guardrails-off vs guardrails-on)</h3>
        {workflow_placeholder}
        """ + (f"""
        <div class="cards">
            <div class="card"><strong>{blocked_mo}/{n}</strong> <span class="meta">blocked or refused (model-only)</span></div>
            <div class="card"><strong>{blocked_go}/{n}</strong> <span class="meta">blocked or refused (guardrails-on)</span></div>
            <div class="card"><strong>{added}</strong> <span class="meta">guardrails added value</span></div>
            <div class="card"><strong>{out_rail_wf_count}</strong> <span class="meta">blocked by output_guardrail in workflow</span></div>
        </div>
        """ if has_wf else "") + """
        <h3>Comparison table (same attacks, side-by-side)</h3>
        """ + (f"""
        <table>
            <thead><tr><th>ID</th><th>Category</th><th>Model-only (response / blocked_by / outcome)</th><th>Guardrails-on (response / blocked_by / outcome)</th></tr></thead>
            <tbody>
            """ + comparison_table_rows + """
            </tbody>
        </table>
        """ if comparison_pairs else "<p>No workflow comparison data.</p>") + """
    </div>

    <div class="section">
        <h2>Safety and security measures — did they work?</h2>
        <p><strong>Input guardrail</strong> blocked """ + f"{inp['blocked']}/{inp['total']} ({inp_pct}%)" + """ of input attacks in the layer test. """ + (
            f"<strong>Output guardrail</strong> blocked {out['blocked']}/{out['total']} ({out_pct}%) of toxic pairs in the layer test."
            if out["total"] else "Output guardrail layer test had no pairs."
        ) + (
            f" In the workflow with guardrails on, {blocked_go}/{n} attacks were blocked or refused (vs {blocked_mo}/{n} model-only); guardrails added {added} extra blocks. "
            + (f"{out_rail_wf_count} attack(s) were blocked by the output guardrail in the workflow (model produced something that the output guardrail then blocked). " if out_rail_wf_count else "")
            + "Input guardrail is the first line of defense; output guardrail catches toxic model outputs when they occur."
            if has_wf else " Run both workflow phases to see guardrails added value."
        ) + "</p>\n    </div>" + """
    <div class="section">
        <h2>Visualizations</h2>
        <div class="chart-wrap">
            <p><strong>Block rate comparison</strong> (same attacks)</p>
            <canvas id="chartBlockRate"></canvas>
        </div>
        """ + (f"""
        <div class="chart-wrap">
            <p><strong>Blocked by (guardrails-on)</strong></p>
            <canvas id="chartBlockedBy"></canvas>
        </div>
        <div class="chart-wrap">
            <p><strong>Outcome distribution (model-only)</strong></p>
            <canvas id="chartOutcome"></canvas>
        </div>
        """ if has_wf else "") + """
        <div class="cards">
            <div class="card"><strong>Input guardrail</strong> <span class="meta">""" + f"{inp['blocked']}/{inp['total']} blocked" + """</span></div>
            <div class="card"><strong>Output guardrail</strong> <span class="meta">""" + f"{out['blocked']}/{out['total']} blocked" + """</span></div>
        </div>
    </div>

    <div class="section">
        <h2>How to reproduce</h2>
        <ol>
            <li><code>PYTHONPATH=. python attack_scripts/check_input_guardrails.py</code></li>
            <li><code>PYTHONPATH=. python attack_scripts/check_output_guardrails.py</code></li>
            <li><code>PYTHONPATH=. python attack_scripts/run_workflow_attacks.py --phase model-only --output-dir attack_scripts/results</code> (optionally <code>--minimal --limit N</code>)</li>
            <li><code>PYTHONPATH=. python attack_scripts/run_workflow_attacks.py --phase guardrails-on --output-dir attack_scripts/results</code></li>
            <li><code>PYTHONPATH=. python attack_scripts/generate_safety_report.py --results-dir attack_scripts/results</code></li>
        </ol>
    </div>

    <script>
        """ + _chart_script(has_wf, n, blocked_mo, blocked_go, blocked_by_labels, blocked_by_data, outcome_labels, outcome_data) + """
    </script>
</body>
</html>
"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)


def _escape(s: str) -> str:
    if not s:
        return ""
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _chart_script(
    has_wf: bool,
    n: int,
    blocked_mo: int,
    blocked_go: int,
    blocked_by_labels: list,
    blocked_by_data: list,
    outcome_labels: list,
    outcome_data: list,
) -> str:
    """Return JS that creates Chart.js charts."""
    block_rate_js = f"""
        new Chart(document.getElementById('chartBlockRate'), {{
            type: 'bar',
            data: {{
                labels: ['Model-only (guardrails OFF)', 'Guardrails ON'],
                datasets: [{{ label: 'Blocked or refused', data: [{blocked_mo}, {blocked_go}], backgroundColor: ['#6c757d', '#0d6efd'] }}]
            }},
            options: {{ indexAxis: 'y', scales: {{ x: {{ max: {max(blocked_mo, blocked_go, n) + 2} }} }}, plugins: {{ legend: {{ display: false }} }} }}
        }});
    """
    if not has_wf:
        return ""
    blocked_by_js = ""
    if blocked_by_labels and blocked_by_data:
        labels_js = json.dumps(blocked_by_labels)
        data_js = json.dumps(blocked_by_data)
        blocked_by_js = f"""
        new Chart(document.getElementById('chartBlockedBy'), {{
            type: 'pie',
            data: {{ labels: {labels_js}, datasets: [{{ data: {data_js}, backgroundColor: ['#0d6efd', '#fd7e14', '#6c757d'] }}] }},
            options: {{ plugins: {{ legend: {{ position: 'right' }} }} }}
        }});
    """
    outcome_js = ""
    if outcome_labels and outcome_data:
        ol = json.dumps(outcome_labels)
        od = json.dumps(outcome_data)
        outcome_js = f"""
        new Chart(document.getElementById('chartOutcome'), {{
            type: 'pie',
            data: {{ labels: {ol}, datasets: [{{ data: {od}, backgroundColor: ['#198754', '#dc3545', '#ffc107'] }}] }},
            options: {{ plugins: {{ legend: {{ position: 'right' }} }} }}
        }});
    """
    return block_rate_js + blocked_by_js + outcome_js


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate HTML safety report from guardrail test results")
    parser.add_argument("--results-dir", type=Path, default=DEFAULT_RESULTS_DIR, help="Directory containing workflow_attacks_*.json")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output HTML path")
    parser.add_argument("--no-run-layer-tests", action="store_true", help="Do not run check_input/output_guardrails; use zeros for layer results")
    args = parser.parse_args()

    results_dir = args.results_dir.resolve() if not args.results_dir.is_absolute() else args.results_dir
    output_path = args.output.resolve() if not args.output.is_absolute() else args.output

    if args.no_run_layer_tests:
        layer = {
            "input_guardrail": {"total": 0, "blocked": 0, "failed": 0},
            "output_guardrail": {"total": 0, "blocked": 0, "failed": 0},
        }
    else:
        layer = run_layer_tests()

    model_only, guardrails_on = load_workflow_results(results_dir)
    workflow_metrics = compute_workflow_metrics(model_only, guardrails_on)

    build_html(layer, workflow_metrics, output_path, results_dir)
    print(f"Report written to {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
