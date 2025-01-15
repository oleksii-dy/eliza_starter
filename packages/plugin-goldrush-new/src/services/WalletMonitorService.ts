import { Service, IAgentRuntime, elizaLogger } from "@elizaos/core";
import { GoldRushProvider } from "../index";

export class WalletMonitorService implements Service {
    private provider: GoldRushProvider;
    private updateInterval: NodeJS.Timeout | null = null;
    private isRunning = false;

    constructor(provider: GoldRushProvider) {
        this.provider = provider;
    }

    async start(runtime: IAgentRuntime): Promise<void> {
        if (this.isRunning) {
            elizaLogger.warn("WalletMonitorService is already running");
            return;
        }

        this.isRunning = true;
        elizaLogger.info("Starting WalletMonitorService");

        // Update every 5 minutes
        this.updateInterval = setInterval(
            async () => {
                try {
                    const wallets = await this.provider.getMonitoredWallets();
                    elizaLogger.debug("Updating monitored wallets", {
                        count: wallets.length,
                    });

                    for (const wallet of wallets) {
                        try {
                            await this.provider.get(runtime, {
                                address: wallet.address,
                            });
                        } catch (error) {
                            elizaLogger.error("Failed to update wallet", {
                                address: wallet.address,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "Unknown error",
                            });
                        }
                    }
                } catch (error) {
                    elizaLogger.error("Failed to update monitored wallets", {
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    });
                }
            },
            5 * 60 * 1000
        ); // 5 minutes
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        elizaLogger.info("Stopping WalletMonitorService");
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isRunning = false;
    }
}
