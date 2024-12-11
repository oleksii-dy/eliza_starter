import { elizaLogger, IAgentRuntime, Memory, Provider } from "@ai16z/eliza";
import btoa from "btoa";

const privyBaseApi = "https://auth.privy.io/api/v1/";

export class PrivyProvider {
    runtime: IAgentRuntime;
    client: any;
    apiHeaders: {
        Authorization: string;
        "privy-app-id": string;
    };

    constructor(runtime: IAgentRuntime) {
        const privyAppId = runtime.getSetting("PRIVY_APP_ID");
        if (!privyAppId) throw new Error("PRIVY_APP_ID not configured");
        const privyAppSecret = runtime.getSetting("PRIVY_APP_SECRET");
        if (!privyAppSecret) throw new Error("PRIVY_APP_SECRET not configured");

        this.apiHeaders = {
            Authorization: `Basic ${btoa(`${privyAppId}:${privyAppSecret}`)}`,
            "privy-app-id": privyAppId,
        };
    }

    // HAVE TO USE REST INSTEAD OF NATIVE PRIVY PACKAGE
    // DUE TO PACKAGING ISSUES WITH COMMONJS
    public async getUserByTwitterUsername(twitterUsername: string) {
        try {
            const resp = await fetch(`${privyBaseApi}/users/twitter/username`, {
                method: "POST",
                headers: {
                    ...this.apiHeaders,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username: twitterUsername }),
            });
            const data = await resp.json();
            if (data.error) {
                throw new Error(data.error);
            }
            return data;
        } catch (err) {
            elizaLogger.error(
                "Error in plugin-prviy getUserByTwitterUsername:",
                err.error
            );
        }
    }

    public async createTwitterUser(linkedAccount: any) {
        try {
            const resp = await fetch(`${privyBaseApi}/users`, {
                method: "POST",
                headers: {
                    ...this.apiHeaders,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    linked_accounts: [linkedAccount],
                    create_ethereum_wallet: true,
                    create_solana_wallet: true,
                }),
            });
            const data = await resp.json();
            if (data.error) {
                throw new Error(data.error);
            }
            return data;
        } catch (err) {
            elizaLogger.error(
                "Error in plugin-prviy createTwitterUser:",
                err.error
            );
        }
    }
}

export const privyProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message: Memory) => {
        if (
            !runtime.getSetting("PRIVY_APP_ID") ||
            !runtime.getSetting("PRIVY_APP_SECRET")
        ) {
            return null;
        }
        try {
            const privyProvider = new PrivyProvider(runtime);
            return privyProvider;
        } catch (error) {
            elizaLogger.error("Error in privyProvider:", error);
            return null;
        }
    },
};
