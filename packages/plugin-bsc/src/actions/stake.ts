import {
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

import { initWalletProvider, WalletProvider } from "../providers/wallet";
import { stakeTemplate, transferTemplate } from "../templates";
import { StakeHubAbi, type StakeParams, type StakeResponse } from "../types";
import { Address, Hex, parseEther } from "viem";

export { stakeTemplate };

// Exported for tests
export class StakeAction {
    private readonly StakeHub =
        "0x0000000000000000000000000000000000002002" as const;

    constructor(private walletProvider: WalletProvider) {}

    async stake(params: StakeParams): Promise<StakeResponse> {
        this.validateStakeParams(params);

        // only support bsc mainnet
        this.walletProvider.switchChain("bsc");
        try {
            let resp: StakeResponse = {
                txHash: "0x",
            };

            switch (params.action) {
                case "delegate":
                    resp.txHash = await this.doDelegate(
                        parseEther(params.amount),
                        params.toValidator!,
                        params.delegateVotePower
                    );
                    break;
                case "undelegate":
                    resp.txHash = await this.doUndelegate(
                        parseEther(params.amount),
                        params.fromValidator!
                    );
                    break;
                case "redelegate":
                    resp.txHash = await this.doRedelegate(
                        parseEther(params.amount),
                        params.fromValidator!,
                        params.toValidator!
                    );
                    break;
                case "claim":
                    resp.txHash = await this.doClaim(params.fromValidator!);
                    break;
            }

            return resp;
        } catch (error) {
            throw new Error(`Stake failed: ${error.message}`);
        }
    }

    validateStakeParams(params: StakeParams) {
        if (params.action === "delegate" || params.action === "redelegate") {
            if (!params.toValidator) {
                throw new Error("toValidator is required");
            }
        }

        if (
            params.action === "undelegate" ||
            params.action === "redelegate" ||
            params.action === "claim"
        ) {
            if (!params.fromValidator) {
                throw new Error("fromValidator is required");
            }
        }
    }

    async doDelegate(
        amount: bigint,
        toValidator: Address,
        delegateVotePower: boolean
    ): Promise<Hex> {
        const publicClient = this.walletProvider.getPublicClient("bsc");
        const walletClient = this.walletProvider.getWalletClient("bsc");

        const { request } = await publicClient.simulateContract({
            account: walletClient.account,
            address: this.StakeHub,
            abi: StakeHubAbi,
            functionName: "delegate",
            args: [toValidator, delegateVotePower],
            value: amount,
        });

        return await walletClient.writeContract(request);
    }

    async doUndelegate(amount: bigint, fromValidator: Address) {
        const publicClient = this.walletProvider.getPublicClient("bsc");
        const walletClient = this.walletProvider.getWalletClient("bsc");

        const { request } = await publicClient.simulateContract({
            account: walletClient.account,
            address: this.StakeHub,
            abi: StakeHubAbi,
            functionName: "undelegate",
            args: [fromValidator, amount],
        });

        return await walletClient.writeContract(request);
    }

    async doRedelegate(
        amount: bigint,
        fromValidator: Address,
        toValidator: Address
    ) {
        const publicClient = this.walletProvider.getPublicClient("bsc");
        const walletClient = this.walletProvider.getWalletClient("bsc");

        const { request } = await publicClient.simulateContract({
            account: walletClient.account,
            address: this.StakeHub,
            abi: StakeHubAbi,
            functionName: "redelegate",
            args: [fromValidator, toValidator, amount, true],
        });

        return await walletClient.writeContract(request);
    }

    async doClaim(fromValidator: Address) {
        const publicClient = this.walletProvider.getPublicClient("bsc");
        const walletClient = this.walletProvider.getWalletClient("bsc");

        const { request } = await publicClient.simulateContract({
            account: walletClient.account,
            address: this.StakeHub,
            abi: StakeHubAbi,
            functionName: "claim",
            args: [fromValidator, 0n], // claim all
        });

        return await walletClient.writeContract(request);
    }
}

export const stakeAction = {
    name: "stake",
    description: "Stake related actions",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting stake action...");

        // Validate stake
        if (!(message.content.source === "direct")) {
            callback?.({
                text: "I can't do that for you.",
                content: { error: "Stake not allowed" },
            });
            return false;
        }

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose stake context
        const stakeContext = composeContext({
            state,
            template: stakeTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: stakeContext,
            modelClass: ModelClass.LARGE,
        });

        const paramOptions: StakeParams = {
            action: content.action,
            toValidator: content.toValidator,
            fromValidator: content.fromValidator,
            amount: content.amount,
            delegateVotePower: content.delegateVotePower ?? true,
        };

        const walletProvider = initWalletProvider(runtime);
        const action = new StakeAction(walletProvider);
        try {
            const stakeResp = await action.stake(paramOptions);
            callback?.({
                text: `Successfully ${paramOptions.action} \nTransaction Hash: ${stakeResp.txHash}`,
                content: { ...stakeResp },
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error during transfer:", error);
            callback?.({
                text: `Stake failed`,
                content: { error: error.message },
            });
            return false;
        }
    },
    template: stakeTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("BSC_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Delegate 1 BNB to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                    action: "delegate",
                },
            },
            {
                user: "user",
                content: {
                    text: "Undelegate 1 BNB from 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                    action: "undelegate",
                },
            },
            {
                user: "user",
                content: {
                    text: "Redelegate 1 BNB from 0x742d35Cc6634C0532925a3b844Bc454e4438f44e to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                    action: "redelegate",
                },
            },
            {
                user: "user",
                content: {
                    text: "Claim locked BNB from 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                    action: "claim",
                },
            },
        ],
    ],
    similes: ["DELEGATE", "UNDELEGATE", "REDELEGATE", "CLAIM"],
};
