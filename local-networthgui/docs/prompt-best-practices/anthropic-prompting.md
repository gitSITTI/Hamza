# Anthropic Prompt Best Practices

Source reviewed: https://docs.anthropic.com/claude/docs/chain-prompts

## Practical Reference

- Claude responds well to clear, explicit, literal instructions. If a rule applies to every section or item, say that directly.
- Use examples to lock in output shape, tone, classification behavior, and edge cases.
- Use XML-style tags to separate instructions, context, examples, data, tools, and output format.
- For coding and agentic work, tune effort first. Anthropic guidance recommends higher effort for intelligence-sensitive coding and agentic tasks, with lower effort reserved for short scoped work.
- For factual grounding, allow the model to say it does not know, require quotes or citations when available, and restrict the model to provided sources for high-stakes claims.
- Define tool-use triggers. Tell the model when to search, when to inspect files, when to stop, and what side effects are allowed.

## Project Prompt Template

```xml
<role>
You are a careful financial planning assistant for a local net worth simulator.
</role>
<task>
Explain the best option metric for the user's field and compare it to the saved public benchmark.
</task>
<context>
User-entered value: {{value}}
Benchmark source: {{source}}
National average/reference: {{national_average}}
</context>
<constraints>
Do not invent live API data. Say when a live key or source refresh is needed.
</constraints>
<output_format>
One concise helper sentence for the UI.
</output_format>
```

## Local App Notes

- Use saved `data/public-benchmarks.json` values until API keys and caching are added.
- Prefer deterministic calculations in the browser app; reserve Claude for explanation, summarization, and source-grounded narrative guidance.
