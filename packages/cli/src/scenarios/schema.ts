import { z } from 'zod';
// Base schema for any evaluation
const BaseEvaluationSchema = z.object({
  type: z.string(),
});
// Specific evaluation schemas
const StringContainsEvaluationSchema = BaseEvaluationSchema.extend({
  type: z.literal('string_contains'),
  value: z.string(),
  case_sensitive: z.boolean().optional(),
});

const StdoutContainsEvaluationSchema = BaseEvaluationSchema.extend({
  type: z.literal('stdout_contains'),
  value: z.string(),
});

const RegexMatchEvaluationSchema = BaseEvaluationSchema.extend({
  type: z.literal('regex_match'),
  pattern: z.string(),
});
const TrajectoryContainsActionSchema = BaseEvaluationSchema.extend({
  type: z.literal('trajectory_contains_action'),
  action: z.string(),
});
const LLMJudgeEvaluationSchema = BaseEvaluationSchema.extend({
  type: z.literal('llm_judge'),
  prompt: z.string(),
  expected: z.string(),
});
// A discriminated union allows Zod to figure out the correct schema based on the 'type' field
const EvaluationSchema = z.discriminatedUnion('type', [
  StringContainsEvaluationSchema,
  StdoutContainsEvaluationSchema,
  RegexMatchEvaluationSchema,
  TrajectoryContainsActionSchema,
  LLMJudgeEvaluationSchema,
  // Future evaluators (like file_exists) will be added here
]);
export const MockSchema = z.object({
  service: z.string(),
  method: z.string(),
  args: z.array(z.any()).optional(),
  response: z.any(),
});
export type Mock = z.infer<typeof MockSchema>;
const SetupSchema = z.object({
  mocks: z.array(MockSchema).optional(),
  virtual_fs: z.record(z.string()).optional(), // map of path -> content
  // db_seed will be added later
});
export const RunStepSchema = z.object({
  input: z.string(),
  evaluations: z.array(EvaluationSchema).optional(),
});
const JudgmentSchema = z.object({
  strategy: z.enum(['all_pass', 'any_pass']),
});
// The master schema for the entire scenario file
export const ScenarioSchema = z.object({
  name: z.string(),
  description: z.string(),
  plugins: z.array(z.string()).optional(),
  environment: z.object({
    type: z.enum(['e2b', 'local']),
  }),
  setup: SetupSchema.optional(),
  run: z.array(RunStepSchema),
  evaluations: z.array(EvaluationSchema).optional(),
});
// Infer the TypeScript type from the Zod schema
export type Scenario = z.infer<typeof ScenarioSchema>; 