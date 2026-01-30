# Guardrails and safety test scripts

Scripts and attack datasets for testing input/output guardrails, safety-without-guardrails (model-only), and guardrails added value. **No backend, no auth**: all tests run in-process from the Python engine; they do not send requests to the NestJS backend and do not require an authentication token.

## No auth required

- Run all scripts from `python_engine/conversational_agent` with `PYTHONPATH=.`
- Do not call the backend (NestJS); workflow tests invoke `run_workflow()` in-process only.
- Attack prompts are for **defensive evaluation only** (research-backed categories: OWASP, HackAPrompt, in-the-wild jailbreaks, GPT-4o-mini–targeted).

## Scripts

| Script | Description |
|--------|-------------|
| `check_input_guardrails.py` | Load attacks from `attacks/input/*`, call `get_safety_guardrails().check_input()` with guardrails on; assert blocked. |
| `check_output_guardrails.py` | Load `attacks/output/toxic_pairs.json`, call `check_output()` with guardrails on; assert blocked. |
| `run_workflow_attacks.py` | Run workflow per attack: `--phase model-only` (guardrails OFF) or `--phase guardrails-on`; capture real `model_response`, `blocked_by`, `outcome`. Use `--compare` for block rates and guardrails added value. **Guardrails-off** is tested this way (real LLM). |
| `run_guardrails_tests.py` | Run check_input, check_output; optional `--workflow` to run comparison if results exist. |

## Quick run

```bash
cd python_engine/conversational_agent
PYTHONPATH=. python scripts/check_input_guardrails.py
PYTHONPATH=. python scripts/check_output_guardrails.py
PYTHONPATH=. python scripts/run_guardrails_tests.py
```

---

## How to run the guardrails-off scenario (model-only)

This is the test of **“what does the model do when guardrails are off?”** — it sends the same attack payloads to GPT-4o-mini with guardrails disabled and records the real model response, `blocked_by`, and `outcome` (refused_by_model, harmful_output, or safe).

**Requirements:**

- `OPENAI_API_KEY` set in `.env` (or environment). The workflow calls the OpenAI API; no NestJS backend or auth.
- Run from `python_engine/conversational_agent`.

**Steps:**

1. **Run model-only phase** (guardrails OFF; real LLM):

   ```bash
   cd python_engine/conversational_agent
   PYTHONPATH=. python scripts/run_workflow_attacks.py --phase model-only --output-dir scripts/results
   ```

   Optionally set `GUARDRAIL_PROVIDERS=""` in the environment so the singleton is correct from the start (the script also sets it internally):

   ```bash
   GUARDRAIL_PROVIDERS="" PYTHONPATH=. python scripts/run_workflow_attacks.py --phase model-only --output-dir scripts/results
   ```

   Results are written to `scripts/results/workflow_attacks_model_only.json` and `.csv` (attack_id, category, model_response, blocked_by, outcome).

2. **Optional: run guardrails-on and compare**

   ```bash
   PYTHONPATH=. python scripts/run_workflow_attacks.py --phase guardrails-on --output-dir scripts/results
   PYTHONPATH=. python scripts/run_workflow_attacks.py --compare --output-dir scripts/results
   ```

   The compare step prints block rates for model-only vs guardrails-on and “Guardrails added value” (extra blocks from the guardrail layer).

**Useful options:**

| Option | Description |
|--------|-------------|
| `--show-responses` | Print each model response to stdout. |
| `--limit N` | Run only the first N attacks (e.g. `--limit 5` for a quick check). |

Example (quick run with 3 attacks and responses shown):

```bash
PYTHONPATH=. python scripts/run_workflow_attacks.py --phase model-only --output-dir scripts/results --limit 3 --show-responses
```

## Attack datasets

See [attacks/README.md](attacks/README.md) for categories and sources (OWASP, HackAPrompt, GPT-4o-mini–targeted).
