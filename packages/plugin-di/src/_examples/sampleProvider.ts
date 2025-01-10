import { injectable } from "inversify";
import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";
import { InjectableProvider } from "../types";
import { globalContainer } from "../di";

/**
 * Sample Provider
 */
@injectable()
export class SampleProvider
    implements InjectableProvider<Record<string, string>>, Provider
{
    private _sharedInstance: Record<string, string>;

    // ---- Implementing the InjectableProvider interface ----

    async getInstance(
        _runtime: IAgentRuntime
    ): Promise<Record<string, string>> {
        if (!this._sharedInstance) {
            this._sharedInstance = {};
        }
        return this._sharedInstance;
    }

    // ---- Implementing the Provider interface ----

    async get(
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State
    ): Promise<void> {
        elizaLogger.log("Retrieving data in sampleProvider...");
    }
}

// Register the provider with the global container
globalContainer.bind(SampleProvider).toSelf();
