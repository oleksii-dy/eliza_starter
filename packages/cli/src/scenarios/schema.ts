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

const FileExistsEvaluationSchema = z.object({
    type: z.literal('file_exists'),
    path: z.string(),
});

const TrajectoryContainsActionEvaluationSchema = z.object({
    type: z.literal('trajectory_contains_action'),
    action: z.string(),
});

const LLMJudgeEvaluationSchema = z.object({
    type: z.literal('llm_judge'),
    prompt: z.string(),
    expected: z.string(),
});

const RegexMatchEvaluationSchema = z.object({
    type: z.literal('regex_match'),
    pattern: z.string(),
    output: z.enum(['stdout', 'stderr']),
});

export const EvaluationSchema = z.union([
    StdoutContainsEvaluationSchema,
    FileExistsEvaluationSchema,
    TrajectoryContainsActionEvaluationSchema,
    LLMJudgeEvaluationSchema,
    RegexMatchEvaluationSchema,
]);
export const MockSchema = z.object({
  service: z.string(),
  method: z.string(),
  when: z.object({
    args: z.array(z.any()),
  }).optional(),
  response: z.any(),
});
export type Mock = z.infer<typeof MockSchema>;
const SetupSchema = z.object({
  mocks: z.array(MockSchema).optional(),
  commands: z.array(z.string()).optional(),
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
  judgment: JudgmentSchema.optional(),
});
// Infer the TypeScript type from the Zod schema
export type Scenario = z.infer<typeof ScenarioSchema>; 