# DeepSearch Plugin for elizaOS

This plugin implements an iterative search → read → reason loop powered by the Firecrawl API. It exposes a single action that can be invoked via `runtime.action("deepSearch", ...)`.

The service generates search queries with a language model, executes them using Firecrawl, summarises the results, and recursively explores follow-up queries. The final answer is produced from all learnings and returned with the visited URLs as citations.

## Development

```
# Start development with hot-reloading
npm run dev
```

Set `FIRECRAWL_API_KEY` (and optionally `FIRECRAWL_BASE_URL` for self-hosted deployments) in your environment.

```ts
const result = await runtime.action('deepSearch', { question: 'What is Firecrawl?', depth: 2, breadth: 3 });
```

Run `npm run build` to produce compiled output in the `dist/` folder.
