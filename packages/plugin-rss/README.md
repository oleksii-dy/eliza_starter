# @elizaos/plugin-rss

A plugin that lets ElizaOS agents watch RSS feeds and capture articles as memories.

## How it works

1. `RSSService` reads the `RSS_FEEDS` runtime setting (comma separated URLs) and polls each feed every few minutes.
2. New items become **document** memories with `source: rss` and trigger the `rssInterestEvaluator`.
3. The evaluator summarizes each item using a language model and marks whether it warrants further research.
4. Summaries and follow‑up notes are stored as additional memories so agents can recall insights globally or by topic.

## Usage

```ts
import rssPlugin from '@elizaos/plugin-rss';
import bootstrapPlugin from '@elizaos/plugin-bootstrap';

const runtime = new AgentRuntime({ plugins: [bootstrapPlugin, rssPlugin] });
```

Configure your feeds via environment variables:

```bash
RSS_FEEDS=https://example.com/feed,https://another.com/rss
```

The plugin is general purpose and works well for crypto news, research updates, or any RSS sources.
