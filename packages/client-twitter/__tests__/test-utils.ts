import { IAgentRuntime } from '@elizaos/core';

export type TestAgentRuntime = Partial<IAgentRuntime> & {
    env: Record<string, string>;
    getEnv: (key: string) => string | null;
    getSetting: (key: string) => string | null;
};