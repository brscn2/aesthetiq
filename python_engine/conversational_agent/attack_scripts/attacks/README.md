# Attack datasets for guardrail and safety testing

Input attacks live in `input/*.txt` (one payload per non-empty line). Output attacks are prompt/response pairs in `output/toxic_pairs.json`. All tests run in-process; no backend or auth required.

## Input attack categories

| File | Description |
|------|-------------|
| `prompt_injection.txt` | Direct prompt injection: ignore instructions, reveal system prompt, override filters (OWASP LLM01-style). |
| `jailbreak_style.txt` | Role-play jailbreaks: DAN, “no restrictions”, “different AI with no guidelines”. |
| `obfuscation.txt` | Obfuscated injections: leetspeak, typos, Unicode escapes to evade keyword detection. |
| `toxicity_elicitation.txt` | Toxicity and harm: violence, self-harm, weapons, explosives (defensive evaluation only). |
| `gpt41_nano_targeted.txt` | Model-specific: developer mode, API simulation, security-eval framing for GPT-4.1-nano. |
| `gpt41_nano_extreme.txt` | Extreme research-backed prompts: Plinny-style, involuntary jailbreak, resource-hijack style. |

Attack sets are research-backed (OWASP LLM Top 10, HackAPrompt, GPT-4.1-nano–targeted). Use for defensive evaluation and red-team testing only.

## Output attacks

`output/toxic_pairs.json` contains `{ "prompt": "...", "response": "..." }` pairs that should be blocked by the output guardrail.
