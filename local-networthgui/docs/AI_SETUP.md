# AI Setup

## Installed Packages

- `openai`: OpenAI SDK for future Responses API workflows.
- `@anthropic-ai/sdk`: Anthropic SDK for future Claude workflows.
- `zod`: Runtime validation for API payloads and structured outputs.
- `dotenv`: Local environment loading for API keys.
- `@openai/codex`: OpenAI coding-agent CLI package.
- `@anthropic-ai/claude-code`: Anthropic Claude Code CLI package.
- `@playwright/test`: Browser smoke and regression tests.
- `vite`: Local static server for the app.

## Environment Variables For Later

```text
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
BEA_API_KEY=
HUDUSER_API_KEY=
REGULATIONS_GOV_API_KEY=
CONGRESS_GOV_API_KEY=
GOVINFO_API_KEY=
FEC_API_KEY=
PACER_ACCOUNT=
```

## Prompt References

- OpenAI: `docs/prompt-best-practices/openai-prompting.md`
- Anthropic: `docs/prompt-best-practices/anthropic-prompting.md`

## Project Skills

- OpenAI project skill: `.cursor/skills/openai-product-engineering/SKILL.md`
- Anthropic project skill: `.cursor/skills/anthropic-product-engineering/SKILL.md`

## Data Plan

The app now uses saved local snapshots under `data/snapshots/`, refreshed public benchmarks in `data/public-benchmarks.json`, and a generated government cache manifest under `data/gov-cache/`.

Run:

```text
npm run gov:refresh:dry
npm run gov:refresh
npm run gov:validate
```

The refresh pipeline pulls no-key public sources first and marks key-gated APIs as `missing-key` until credentials are configured. Hugging Face mirrors should only be added when their dataset metadata confirms the original government source URL.
