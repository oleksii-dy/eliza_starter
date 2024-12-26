import { Provider, IAgentRuntime, Memory, State } from "../types";
import { PrivyClient } from "@privy-io/server-auth";

type ChainType = "ethereum" | "solana";
type WalletResponse = {
  id: string;
  address: string;
  chainType: ChainType;
};

type TransactionConfig = {
  to: string;
  value: number;
  chainId?: number;
  idempotencyKey?: string;
};

export class PrivyWalletProvider {
  private privy: PrivyClient;
  private currentChain: ChainType = "ethereum";

  constructor(appId: string, appSecret: string) {
    this.privy = new PrivyClient(appId, appSecret);
  }

  async createWallet(chainType: ChainType = "ethereum"): Promise<WalletResponse> {
    try {
      const wallet = await this.privy.walletApi.create({ chainType });
      return wallet;
    } catch (error) {
      console.error("Error creating Privy wallet:", error);
      throw error;
    }
  }

  async signMessage(walletId: string, message: string, encoding: "utf-8" | "hex" = "utf-8") {
    try {
      const { data } = await this.privy.walletApi.rpc({
        walletId,
        method: this.currentChain === "ethereum" ? "personal_sign" : "signMessage",
        params: { message, encoding },
      });
      return data;
    } catch (error) {
      console.error("Error signing message:", error);
      throw error;
    }
  }

  async sendTransaction(walletId: string, config: TransactionConfig) {
    try {
      const { data } = await this.privy.walletApi.rpc({
        walletId,
        method: this.currentChain === "ethereum" ? "eth_sendTransaction" : "signAndSendTransaction",
        caip2: `eip155:${config.chainId || 1}`,
        params: {
          transaction: {
            to: config.to,
            value: config.value,
            chainId: config.chainId,
          },
        },
        idempotencyKey: config.idempotencyKey,
      });
      return data;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  }

  setCurrentChain(chain: ChainType) {
    this.currentChain = chain;
  }

  getCurrentChain(): ChainType {
    return this.currentChain;
  }
}

export const initPrivyWalletProvider = (runtime: IAgentRuntime): PrivyWalletProvider => {
  const appId = runtime.getSetting("PRIVY_APP_ID");
  const appSecret = runtime.getSetting("PRIVY_APP_SECRET");

  if (!appId || !appSecret) {
    throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be set");
  }

  return new PrivyWalletProvider(appId, appSecret);
};

export const privyWalletProvider: Provider = {
  async get(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<{ status: string; chain: ChainType } | null> {
    try {
      const provider = initPrivyWalletProvider(runtime);
      return {
        status: "active",
        chain: provider.getCurrentChain(),
      };
    } catch (error) {
      console.error("Error in Privy wallet provider:", error);
      return null;
    }
  },
};
