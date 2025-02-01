declare module "@elizaos/core" {
    export interface IAgentRuntime {
        composeState(message: Memory): Promise<State>;
        updateRecentMessageState(state: State): Promise<State>;
    }

    export interface Memory {
        [key: string]: any;
    }

    export interface Provider {
        [key: string]: any;
    }

    export interface State {
        [key: string]: any;
    }

    export const settings: {
        [key: string]: any;
    };
}

declare module "starknet" {
    export interface Provider {
        sequencer: {
            network: string;
        };
    }

    export class Contract {
        constructor(address: string, abi: any[], provider: Provider);
    }

    export class Provider {
        constructor(config: { sequencer: { network: string } });
    }

    export const num: {
        toBigInt(value: string | number): bigint;
    };
}

