import { z } from 'zod';

export const ZodFile = z.object({
  path: z.string(),
  content: z.string(),
});

export const ZodMock = z.object({
  service: z.string(),
  method: z.string(),
  response: z.any(),
});

export const ZodEvaluation = z.object({
  type: z.string(),
  path: z.string().optional(),
  value: z.string().optional(),
  pattern: z.string().optional(),
  command: z.string().optional(),
  expected_code: z.number().optional(),
  action: z.string().optional(),
  prompt: z.string().optional(),
  expected: z.string().optional(),
});

export const ZodRun = z.object({
  input: z.string(),
  evaluations: z.array(ZodEvaluation),
});

export const ZodScenario = z.object({
  name: z.string(),
  description: z.string().optional(),
  plugins: z.array(z.string()),
  environment: z.object({
    type: z.enum(['e2b', 'local']),
  }),
  setup: z.object({
    mocks: z.array(ZodMock).optional(),
    filesystem: z.array(ZodFile).optional(),
  }),
  run: z.array(ZodRun),
  judgment: z.object({
    strategy: z.enum(['all_pass']),
  }),
});

export type Scenario = z.infer<typeof ZodScenario>;
export type Evaluation = z.infer<typeof ZodEvaluation>;
export type Mock = z.infer<typeof ZodMock>;
export type File = z.infer<typeof ZodFile>; 