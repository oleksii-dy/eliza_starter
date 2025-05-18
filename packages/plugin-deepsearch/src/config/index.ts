import { z } from 'zod';

/** Default configuration schema for the DeepSearch plugin. */
export const defaultConfigSchema = z.object({
  search_provider: z.string().default('firecrawl'),
  token_budget: z.number().int().default(16000),
  max_iterations: z.number().int().default(3),
});

export type DeepSearchConfig = z.infer<typeof defaultConfigSchema>;
