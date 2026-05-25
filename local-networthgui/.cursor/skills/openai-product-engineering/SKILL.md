---
name: openai-product-engineering
description: Build and review OpenAI API integrations, prompt workflows, evals, and agent tools. Use when working with OpenAI models, Responses API, structured outputs, prompt engineering, Codex, or OpenAI agentic features in this project.
---

# OpenAI Product Engineering

## Workflow

1. Read `docs/prompt-best-practices/openai-prompting.md` before writing or changing OpenAI prompts.
2. Prefer the Responses API for new work and do not assume text is always at the first output item; use SDK helpers like `output_text` where appropriate.
3. Keep production model strings pinned when behavior consistency matters.
4. Add eval cases for any prompt that affects user-facing financial guidance, structured extraction, or automation.
5. Use structured outputs for data contracts instead of asking the model to produce informal JSON.
6. Keep API keys out of source files; use `.env` and document required variables.

## Review Checklist

- [ ] Prompt states role, task, inputs, constraints, and output format.
- [ ] Critical facts are grounded in app data or cited public sources.
- [ ] Tool calls and allowed side effects are explicit.
- [ ] Failure behavior is defined for missing data, invalid inputs, and low confidence.
- [ ] Cost, latency, and model choice are appropriate for the user path.
