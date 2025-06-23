import { IAgentRuntime, Service, logger } from "@elizaos/core";
import { Connection, PublicKey, Logs, AccountChangeCallback, LogsCallback, LogsFilter, SignatureResultCallback, SlotChangeCallback } from "@solana/web3.js";

interface SubscriptionInfo {
    id: number;
    type: 'account' | 'logs' | 'signature' | 'slot';
    callback: Function;
}

export class WebSocketService extends Service {
    static serviceName = "websocket";
    static serviceType = "websocket-service";
    capabilityDescription = "Real-time Solana blockchain updates via WebSocket";

    protected runtime: IAgentRuntime;
    private connection: Connection;
    private subscriptions: Map<string, SubscriptionInfo> = new Map();
    private isConnected: boolean = false;
    private reconnectTimer?: NodeJS.Timeout;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private reconnectDelay: number = 5000;

    constructor(runtime: IAgentRuntime) {
        super();
        this.runtime = runtime;
        this.connection = new Connection(
            runtime.getSetting("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com"
        );
    }

    static async start(runtime: IAgentRuntime): Promise<WebSocketService> {
        const service = new WebSocketService(runtime);
        await service.initialize();
        return service;
    }

    async initialize(): Promise<void> {
        this.isConnected = true;
    }

    async stop(): Promise<void> {
        this.disconnect();
    }

    /**
     * Subscribe to account changes
     */
    async subscribeToAccount(
        pubkey: PublicKey,
        callback: AccountChangeCallback
    ): Promise<string> {
        try {
            const subscriptionId = await this.connection.onAccountChange(
                pubkey,
                callback,
                'confirmed'
            );

            const subscriptionKey = `account-${pubkey.toString()}`;
            this.subscriptions.set(subscriptionKey, {
                id: subscriptionId,
                type: 'account',
                callback,
            });

            logger.info('[WebSocket] Subscribed to account changes', {
                pubkey: pubkey.toString(),
                subscriptionId,
            });

            return subscriptionKey;
        } catch (error) {
            logger.error('[WebSocket] Failed to subscribe to account', {
                pubkey: pubkey.toString(),
                error,
            });
            throw error;
        }
    }

    /**
     * Subscribe to transaction logs
     */
    async subscribeToLogs(
        filter: LogsFilter,
        callback: LogsCallback
    ): Promise<string> {
        try {
            const subscriptionId = await this.connection.onLogs(
                filter,
                callback,
                'confirmed'
            );

            const subscriptionKey = `logs-${JSON.stringify(filter)}`;
            this.subscriptions.set(subscriptionKey, {
                id: subscriptionId,
                type: 'logs',
                callback,
            });

            logger.info('[WebSocket] Subscribed to logs', {
                filter,
                subscriptionId,
            });

            return subscriptionKey;
        } catch (error) {
            logger.error('[WebSocket] Failed to subscribe to logs', {
                filter,
                error,
            });
            throw error;
        }
    }

    /**
     * Subscribe to signature confirmation
     */
    async subscribeToSignature(
        signature: string,
        callback: SignatureResultCallback
    ): Promise<string> {
        try {
            const subscriptionId = await this.connection.onSignature(
                signature,
                callback,
                'confirmed'
            );

            const subscriptionKey = `signature-${signature}`;
            this.subscriptions.set(subscriptionKey, {
                id: subscriptionId,
                type: 'signature',
                callback,
            });

            logger.info('[WebSocket] Subscribed to signature', {
                signature,
                subscriptionId,
            });

            return subscriptionKey;
        } catch (error) {
            logger.error('[WebSocket] Failed to subscribe to signature', {
                signature,
                error,
            });
            throw error;
        }
    }

    /**
     * Subscribe to slot changes
     */
    async subscribeToSlotChanges(callback: SlotChangeCallback): Promise<string> {
        try {
            const subscriptionId = await this.connection.onSlotChange(callback);

            const subscriptionKey = 'slot-changes';
            this.subscriptions.set(subscriptionKey, {
                id: subscriptionId,
                type: 'slot',
                callback,
            });

            logger.info('[WebSocket] Subscribed to slot changes', {
                subscriptionId,
            });

            return subscriptionKey;
        } catch (error) {
            logger.error('[WebSocket] Failed to subscribe to slot changes', { error });
            throw error;
        }
    }

    /**
     * Subscribe to program account changes
     */
    async subscribeToProgramAccounts(
        programId: PublicKey,
        filters?: any[]
        callback?: (accountData: any) => void
    ): Promise<string> {
        try {
            const subscriptionId = await this.connection.onProgramAccountChange(
                programId,
                (accountInfo) => {
                    logger.debug('[WebSocket] Program account update', {
                        programId: programId.toString(),
                        account: accountInfo.accountId.toString(),
                    });

                    if (callback) {
                        callback({
                            pubkey: accountInfo.accountId,
                            account: accountInfo.accountInfo,
                        });
                    }
                },
                'confirmed',
                filters
            );

            const subscriptionKey = `program-${programId.toString()}`;
            this.subscriptions.set(subscriptionKey, {
                id: subscriptionId,
                type: 'account',
                callback: callback || (() => {}),
            });

            logger.info('[WebSocket] Subscribed to program accounts', {
                programId: programId.toString(),
                subscriptionId,
                filterCount: filters?.length || 0,
            });

            return subscriptionKey;
        } catch (error) {
            logger.error('[WebSocket] Failed to subscribe to program accounts', {
                programId: programId.toString(),
                error,
            });
            throw error;
        }
    }

    /**
     * Unsubscribe from a specific subscription
     */
    async unsubscribe(subscriptionKey: string): Promise<void> {
        const subscription = this.subscriptions.get(subscriptionKey);
        if (!subscription) {
            logger.warn('[WebSocket] Subscription not found', { subscriptionKey });
            return;
        }

        try {
            switch (subscription.type) {
                case 'account':
                    await this.connection.removeAccountChangeListener(subscription.id);
                    break;
                case 'logs':
                    await this.connection.removeOnLogsListener(subscription.id);
                    break;
                case 'signature':
                    await this.connection.removeSignatureListener(subscription.id);
                    break;
                case 'slot':
                    await this.connection.removeSlotChangeListener(subscription.id);
                    break;
            }

            this.subscriptions.delete(subscriptionKey);
            logger.info('[WebSocket] Unsubscribed', { subscriptionKey });
        } catch (error) {
            logger.error('[WebSocket] Failed to unsubscribe', {
                subscriptionKey,
                error,
            });
        }
    }

    /**
     * Unsubscribe from all subscriptions
     */
    async unsubscribeAll(): Promise<void> {
        const keys = Array.from(this.subscriptions.keys());
        
        for (const key of keys) {
            await this.unsubscribe(key);
        }

        logger.info('[WebSocket] Unsubscribed from all subscriptions');
    }

    /**
     * Handle disconnection and attempt reconnection
     */
    private handleDisconnect(): void {
        this.isConnected = false;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('[WebSocket] Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        logger.info('[WebSocket] Scheduling reconnection', {
            attempt: this.reconnectAttempts,
            delay: this.reconnectDelay,
        });

        this.reconnectTimer = setTimeout(() => {
            this.reconnect();
        }, this.reconnectDelay);
    }

    /**
     * Attempt to reconnect and resubscribe
     */
    private async reconnect(): Promise<void> {
        try {
            logger.info('[WebSocket] Attempting to reconnect...');
            
            // Test connection
            await this.connection.getSlot();
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Resubscribe to all previous subscriptions
            const subscriptions = Array.from(this.subscriptions.entries());
            this.subscriptions.clear();

            for (const [key, info] of subscriptions) {
                try {
                    if (key.startsWith('account-')) {
                        const pubkey = new PublicKey(key.replace('account-', ''));
                        await this.subscribeToAccount(pubkey, info.callback as AccountChangeCallback);
                    } else if (key.startsWith('logs-')) {
                        // Skip logs for now as we don't store the filter
                        logger.warn('[WebSocket] Cannot restore logs subscription', { key });
                    } else if (key.startsWith('program-')) {
                        const programId = new PublicKey(key.replace('program-', ''));
                        await this.subscribeToProgramAccounts(
                            programId,
                            undefined,
                            info.callback as any
                        );
                    }
                } catch (error) {
                    logger.error('[WebSocket] Failed to restore subscription', {
                        key,
                        error,
                    });
                }
            }

            logger.info('[WebSocket] Reconnected successfully');
        } catch (error) {
            logger.error('[WebSocket] Reconnection failed', { error });
            this.handleDisconnect();
        }
    }

    /**
     * Disconnect and cleanup
     */
    private disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }

        this.unsubscribeAll();
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }

    /**
     * Get connection status
     */
    getStatus(): {
        isConnected: boolean;
        subscriptionCount: number;
        reconnectAttempts: number;
    } {
        return {
            isConnected: this.isConnected,
            subscriptionCount: this.subscriptions.size,
            reconnectAttempts: this.reconnectAttempts,
        };
    }
} 