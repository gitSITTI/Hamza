# OpenAI Prompt Best Practices

Source reviewed: https://platform.openai.com/docs/guides/prompt-engineering

## Practical Reference

- Use the Responses API for new text generation workflows.
- Do not assume the first response output item is the final text. The response may include messages, tool calls, reasoning data, or other output items. Prefer official SDK conveniences like `output_text` when they match the use case.
- Put high-level behavior, tone, goals, constraints, and examples in the `instructions` parameter so they take priority over task input.
- Choose models deliberately. Reasoning models are stronger for complex planning and multi-step analysis; GPT models are fast and cost-efficient but benefit from explicit instructions.
- Pin production apps to specific model snapshots when behavior consistency matters.
- Build evals for prompts that affect product behavior, financial guidance, automation, or structured outputs.
- Use structured outputs when the app needs a reliable JSON contract.

## Project Prompt Template

```text
Role: [specific expert role]
Task: [single outcome]
Context: [user data, local benchmark data, and source provenance]
Constraints: [security, financial-disclaimer, formatting, no invented facts]
Output: [exact sections or JSON schema]
Uncertainty: If the available data is insufficient, say what is missing and do not guess.
```

## Local App Notes

- Any AI-generated financial recommendation must cite whether it came from user-entered data, saved local benchmark data, or a future live API source.
- Keep API credentials in `.env`; do not commit keys.
- Add eval fixtures before replacing deterministic calculations with model output.
