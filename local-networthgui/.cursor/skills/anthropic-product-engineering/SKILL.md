---
name: anthropic-product-engineering
description: Build and review Anthropic Claude API integrations, Claude prompts, tool-use flows, and agent workflows. Use when working with Anthropic models, Claude prompt engineering, XML prompt structure, effort settings, hallucination reduction, or Claude Code in this project.
---

# Anthropic Product Engineering

## Workflow

1. Read `docs/prompt-best-practices/anthropic-prompting.md` before writing or changing Claude prompts.
2. Use clear, literal instructions; state the scope explicitly when the behavior must apply to every item.
3. Structure complex prompts with XML-style sections such as `<task>`, `<context>`, `<constraints>`, and `<output_format>`.
4. Use examples for output shape and edge cases when classification, extraction, or financial wording must be stable.
5. Tune effort before over-prompting complex coding or agentic work.
6. Allow uncertainty and require source grounding for claims that affect user decisions.

## Review Checklist

- [ ] Prompt separates instructions, context, examples, and output schema.
- [ ] Tool-use triggers and stopping conditions are clear.
- [ ] The model may say it does not know when data is insufficient.
- [ ] High-impact advice includes verification or citation requirements.
- [ ] API keys stay in `.env`, not source files.
