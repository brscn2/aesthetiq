# Attack datasets for guardrails and safety testing

**Defensive use only.** These prompts and pairs are used to evaluate input/output guardrails and to compare model-only vs model+guardrails block rates. They are not for reproducing harmful content.

## Layout

- **input/** — One text file per category; one attack payload per line (no empty lines in payload). Used for input guardrail tests and for workflow attack runs (model-only and guardrails-on).
- **output/** — `toxic_pairs.json`: list of `{"prompt": "...", "response": "..."}` for deterministic output guardrail checks.

## Categories (input/)

| File | Description | Sources |
|------|-------------|---------|
| `prompt_injection.txt` | Direct instruction override, privilege escalation, system-prompt extraction | OWASP LLM01, HackAPrompt |
| `jailbreak_style.txt` | "Do Anything Now", role-play, virtualization, deception | In-the-wild jailbreak studies |
| `obfuscation.txt` | Encoding, typoglycemia, leetspeak, indirect phrasing | HackAPrompt, OWASP |
| `toxicity_elicitation.txt` | Prompts designed to elicit harmful or toxic output | Toxicity benchmarks |
| `gpt4o_mini_targeted.txt` | Patterns tailored to GPT-4o-mini / GPT-4o family | arxiv 2511.17666, in-the-wild |

## Usage

- **No backend, no auth**: All tests run in-process from the Python engine; they do not send requests to the NestJS backend and do not require an authentication token.
- Scripts load from `scripts/attacks/input/*` and `scripts/attacks/output/toxic_pairs.json` when run with `PYTHONPATH=.` from `python_engine/conversational_agent`.
