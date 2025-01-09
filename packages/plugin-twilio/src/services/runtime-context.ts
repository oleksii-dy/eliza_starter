import { IAgentRuntime } from '@elizaos/core';

export class RuntimeContext {
    private static runtime: IAgentRuntime | null = null;

    static setRuntime(runtime: IAgentRuntime) {
        this.runtime = runtime;
    }

    static getRuntime(): IAgentRuntime | null {
        return this.runtime;
    }
}