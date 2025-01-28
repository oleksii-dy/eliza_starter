import {
    elizaLogger,
    Client,
    IAgentRuntime,
    Memory,
    Content,
    HandlerCallback,
    stringToUuid,
    composeContext,
    generateText,
    ModelClass,
    State
} from "@elizaos/core";
import { postTweet } from "@elizaos/plugin-twitter";
import express from "express";
import { WebhookEvent } from "./types";
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType } from '@uniswap/sdk-core';
import { ethers, JsonRpcProvider } from 'ethers';
import { initializeWallet } from "../../plugin-coinbase/src/utils";

export type WalletType = 'short_term_trading' | 'long_term_trading' | 'dry_powder' | 'operational_capital';
export type CoinbaseWallet = { wallet: Wallet, walletType: WalletType };

export class CoinbaseClient implements Client {
    private runtime: IAgentRuntime;
    private server: express.Application;
    private port: number;
    private wallets: CoinbaseWallet[];

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
        this.server = express();
        this.port = Number(runtime.getSetting("COINBASE_WEBHOOK_PORT")) || 3001;
        this.wallets = [];
    }

    async initialize(): Promise<void> {
        elizaLogger.info("Initializing Coinbase client");
        try {
            elizaLogger.info("Coinbase client initialized successfully");
            await this.initializeWallets();
            elizaLogger.info("Wallets initialized successfully");
            await this.setupWebhookEndpoint();
            elizaLogger.info("Webhook endpoint setup successfully");
        } catch (error) {
            elizaLogger.error("Failed to initialize Coinbase client:", error);
            throw error;
        }
    }

    private setupWebhookEndpoint() {
        this.server.use(express.json());

        // Add CORS middleware to allow external requests
        this.server.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'POST');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });

        // Add webhook validation middleware
        const validateWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
            const event = req.body as WebhookEvent;
            if (!event.event || !event.ticker || !event.timestamp || !event.price) {
                res.status(400).json({ error: "Invalid webhook payload" });
                return;
            }
            if (event.event !== 'buy' && event.event !== 'sell') {
                res.status(400).json({ error: "Invalid event type" });
                return;
            }
            next();
        };

        // Add health check endpoint
        this.server.get('/health', (req, res) => {
            res.status(200).json({ status: 'ok' });
        });

        // Main webhook endpoint
        this.server.post("/webhook", validateWebhook, async (req, res) => {
            try {
                const event = req.body as WebhookEvent;
                await this.handleWebhookEvent(event);
                res.status(200).json({ status: "success" });
            } catch (error) {
                elizaLogger.error("Error processing webhook:", error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });

        return new Promise<void>((resolve, reject) => {
            try {
                this.server.listen(this.port, '0.0.0.0', () => {
                    elizaLogger.info(`Webhook server listening on port ${this.port}`);
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    private async initializeWallets() {
        Coinbase.configure({
            apiKeyName:
                this.runtime.getSetting("COINBASE_API_KEY") ??
                process.env.COINBASE_API_KEY,
            privateKey:
                this.runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                process.env.COINBASE_PRIVATE_KEY,
        });
        const walletTypes: WalletType[] = ['short_term_trading', 'long_term_trading', 'dry_powder', 'operational_capital'];
        const networkId = Coinbase.networks.BaseMainnet;
        for (const walletType of walletTypes) {
            elizaLogger.log('walletType ', walletType);
            const wallet = await initializeWallet(this.runtime, networkId, walletType);
            elizaLogger.log('Successfully loaded wallet ', wallet.wallet.getId());
            this.wallets.push(wallet);
        }
    }

    private async generateTweetContent(event: WebhookEvent, amountInCurrency: number, pnlText: string, formattedTimestamp: string, state: State, tx: ethers.Transaction): Promise<string> {
        try {
            const tradeTweetTemplate = `
# Task
Create an engaging and unique tweet announcing a Coinbase trade. Be creative but professional.

Trade details:
- ${event.event.toUpperCase()} order for ${event.ticker}
- Trading amount: $${amountInCurrency.toFixed(2)}
- Current price: $${Number(event.price).toFixed(2)}
- Overall Unrealized PNL: $${pnlText}
- Time: ${formattedTimestamp}
- Transaction: ${tx.hash}
Requirements:
1. Must be under 180 characters
2. Use 1-2 relevant emojis
3. No hashtags
4. Vary the wording each time to keep it fresh and engaging
5. Can mention market conditions, timing, or strategy when relevant
6. Keep it professional but conversational
7. Include the key information: action, amount, ticker, and price

Example variations for buys:
"📈 Just added $1,000 of BTC to the portfolio at $50,000.00. Overall Unrealized PNL: $${pnlText}"
"🎯 Strategic BTC purchase: $1,000 at $50,000.00. Overall Unrealized PNL: $${pnlText}"

Example variations for sells:
"💫 Executed BTC position: Sold $1,000 at $52,000.00. Overall Unrealized PNL: $${pnlText}. See transaction: ${tx.hash}"
"📊 Strategic exit: Released $1,000 of BTC at $52,000.00. Overall Unrealized PNL: $${pnlText}. See transaction: ${tx.hash}"

Generate only the tweet text, no commentary or markdown.`;
            const context = composeContext({
                template: tradeTweetTemplate,
                state
            });

            const tweetContent = await generateText({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.LARGE,
            });

            const trimmedContent = tweetContent.trim();
            return trimmedContent.length > 180 ? trimmedContent.substring(0, 177) + "..." : trimmedContent;

        } catch (error) {
            elizaLogger.error("Error generating tweet content:", error);
            const amount = Number(this.runtime.getSetting('COINBASE_TRADING_AMOUNT')) ?? 1;
            const fallbackTweet = `🚀 ${event.event.toUpperCase()}: $${amount.toFixed(2)} of ${event.ticker} at $${Number(event.price).toFixed(2)}`;
            return fallbackTweet;
        }
    }

    private async handleWebhookEvent(event: WebhookEvent) {
        const roomId = stringToUuid("coinbase-trading");
        await this.runtime.ensureRoomExists(roomId);
        await this.runtime.ensureParticipantInRoom(this.runtime.agentId, roomId);
        // TODO: based off of the signal decide which wallet to use
        const wallet = this.wallets.find(wallet => wallet.walletType === 'short_term_trading');
        if (!wallet) {
            elizaLogger.error("Short term trading wallet not found");
            return;
        }

        const amount = Number(this.runtime.getSetting('COINBASE_TRADING_AMOUNT')) ?? 1;
        const memory: Memory = {
            id: stringToUuid(`coinbase-${event.timestamp}`),
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId,
            content: {
                text: `Place an advanced trade market order to ${event.event.toLowerCase()} $${amount} worth of ${event.ticker}`,
                action: "EXECUTE_ADVANCED_TRADE",
                source: "coinbase",
                metadata: {
                    ticker: event.ticker,
                    side: event.event.toUpperCase(),
                    price: event.price,
                    amount: amount,
                    timestamp: event.timestamp,
                    walletType: wallet.walletType,
                }
            },
            createdAt: Date.now()
        };
        // get short term trading wallet
        // call dex on short term trading wallet
        await this.runtime.messageManager.createMemory(memory);
        const state = await this.runtime.composeState(memory);
        const callback: HandlerCallback = async (content: Content) => {
            if (!content.text.includes("Trade executed successfully")) {
                return [];
            }
        // Generate tweet content
        const formattedTimestamp = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        }).format(new Date(event.timestamp));

        const tx = await this.swapUSDCForToken(event.ticker, amount);
        const pnl = await this.calculateOverallPNL(event.ticker, amount, amount);
        const pnlText = `Overall PNL: $${pnl.toFixed(2)}`;

            try {
                const tweetContent = await this.generateTweetContent(event, amount, pnlText, formattedTimestamp, state, tx);
                elizaLogger.info("Generated tweet content:", tweetContent);
                if (this.runtime.getSetting('TWITTER_DRY_RUN')) {
                    elizaLogger.info("Dry run mode enabled. Skipping tweet posting.",);
                    return;
                }
                const response = await postTweet(this.runtime, tweetContent);
                elizaLogger.info("Tweet response:", response);
            } catch (error) {
                elizaLogger.error("Failed to post tweet:", error);
            }
        };

        await this.runtime.processActions(memory, [memory], state, callback);
    }

    async stop(): Promise<void> {
        try {
            if (this.server?.listen) {
                await new Promise<void>((resolve, reject) => {
                    this.server.listen().close((err: Error | undefined) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
            elizaLogger.info("Coinbase client stopped successfully");
        } catch (error) {
            elizaLogger.error("Error stopping Coinbase client:", error);
            throw error;
        }
    }

    getType(): string {
        return "coinbase";
    }

    getName(): string {
        return "coinbase";
    }

    async start(): Promise<void> {
        await this.initialize();
    }

    private async swap(fromTicker: string, toTicker: string, amountFrom: number) {
        const USDC = new Token(1, '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 6, 'USDC', 'USD Coin');
        const token = new Token(1, toTicker, 18); // Assuming the token has 18 decimals

        const provider = new JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        const amountInCurrency = CurrencyAmount.fromRawAmount(USDC, amountFrom * 10 ** USDC.decimals);

        const route = new Route([USDC, token], USDC);
        const trade = new Trade(route, amountInCurrency, TradeType.EXACT_INPUT);

        const slippageTolerance = new Percent('50', '10000'); // 0.50%
        const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact();

        const transaction = {
            to: route.path[1].address,
            value: ethers.utils.parseUnits(amountOutMin, token.decimals),
            gasLimit: ethers.utils.hexlify(100000),
            gasPrice: ethers.utils.parseUnits('20', 'gwei'),
        };

        const tx = await wallet.sendTransaction(transaction);
        await tx.wait();
        elizaLogger.info("tx", JSON.stringify(tx));
        return tx;
    }

    private async calculateOverallPNL(ticker: string, amountReceived: number, initialInvestment: number): Promise<number> {
        const token = new Token(1, ticker, 18); // Assuming the token has 18 decimals
        const provider = new JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        const tokenContract = new ethers.Contract(token.address, [
            'function balanceOf(address owner) view returns (uint256)',
            'function decimals() view returns (uint8)'
        ], wallet);

        const balance = await tokenContract.balanceOf(wallet.address);
        const decimals = await tokenContract.decimals();
        const currentPrice = await Fetcher.fetchTokenData(1, token.address, provider);

        const currentValue = balance / (10 ** decimals) * currentPrice;
        const pnl = (currentValue - initialInvestment) / initialInvestment * 100;

        return pnl;
    }

}

export const CoinbaseClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        elizaLogger.log("Starting Coinbase client with agent ID:", runtime.agentId);
        const client = new CoinbaseClient(runtime);
        await client.start();
        return client;
    },
    stop: async (runtime: IAgentRuntime) => {
        try {
            elizaLogger.log("Stopping Coinbase client");
            await runtime.clients.coinbase.stop();
        } catch (e) {
            elizaLogger.error("Coinbase client stop error:", e);
        }
    },
};

export default CoinbaseClientInterface;