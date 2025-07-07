import {
  type IAgentRuntime,
  logger,
  Service,
  ServiceType,
} from "@elizaos/core";
import assert from "node:assert";
import { LEVVA_SERVICE } from "../constants/enum.ts";
import { ILevvaService } from "../types/service.ts";
import { BrowserService } from "./browser.ts";
import { blockexplorers } from "../util";
import { CacheEntry } from "src/types/core.ts";
import { CalldataWithDescription } from "src/types/tx.ts";
import { sha256, toHex } from "viem";

const REQUIRED_PLUGINS = ["levva"];

function checkPlugins(runtime: IAgentRuntime) {
  const set = new Set(runtime.plugins.map((plugin) => plugin.name));
  return REQUIRED_PLUGINS.every((plugin) => set.has(plugin));
}

export class LevvaService extends Service implements ILevvaService {
  static serviceType = LEVVA_SERVICE.LEVVA_COMMON;
  capabilityDescription =
    "Levva service should analyze the user's portfolio, suggest earning strategies, swap crypto assets, etc.";

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    assert(checkPlugins(runtime), "Required plugins not found");
  }

  static async start(runtime: IAgentRuntime) {
    logger.info("*** Starting Levva service ***");
    const service = new LevvaService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info("*** Stopping Levva service ***");
    // get the service from the runtime
    const service = runtime.getService(LevvaService.serviceType);
    if (!service) {
      throw new Error("Levva service not found");
    }
    service.stop();
  }

  async stop() {
    logger.info("*** Stopping levva service instance ***");
  }

  async getWalletAssets(params: { address: `0x${string}`; chainId: number }) {
    const browser = await this.runtime.getService<BrowserService>(
      ServiceType.BROWSER
    );
    const explorer = blockexplorers.get(params.chainId);

    if (!explorer) {
      throw new Error(
        `Unsupported chain ${params.chainId}, reason = block explorer not found`
      );
    }

    const url = `${explorer}/address/${params.address}`;
    const cacheKey = `portfolio:${params.address}:${params.chainId}`;
    const cacheTime = 3600000;
    const timestamp = Date.now();

    const cached =
      await this.runtime.getCache<
        CacheEntry<
          { symbol: string; balance: string; value: string; address?: string }[]
        >
      >(cacheKey);

    if (cached?.timestamp && timestamp - cached.timestamp < cacheTime) {
      return cached.value;
    }

    const portfolio = await browser.processPageContent(url, async (html) => {
      const begin = html.indexOf("<!-- Content");
      const end = html.indexOf("<!-- End Content");
      return `<task>analyze given html and extract the wallet assets</task>
        <html>
          ${html.slice(begin, end)}
        </html>
        <instructions>
          - Find the DIV block titled "ETH Balance" and extract the balance.
          - Find the DIV block titled "Token Holdings" and extract the balances and addresses of tokens in dropdown.
        </instructions>
        <keys>
          - "assets" should be an array of objects with the following keys:
            - "symbol"
            - "balance"
            - "value"
            - "address" (optional for native token)
        </keys>
        <output>
          Respond using JSON format like this:
          {
            "assets": [
              {
                "symbol": "ETH",
                "balance": "0.03400134",
                "value": "80.2"
              },
              {
                "symbol": "USDT",
                "balance: "20.1234",
                "value": "20.111223344",
                "address": "0xdac17f958d2ee523a2206206994597c13d831ec7",
              }
            ]
          }
        </output>
        `;
    });

    // todo type check
    const assets: {
      symbol: string;
      balance: string;
      value: string;
      address?: string;
    }[] = portfolio?.assets ?? [];

    await this.runtime.setCache(cacheKey, {
      timestamp,
      value: assets,
    });

    return assets;
  }

  formatWalletAssets(assets: { symbol: string, balance: string, value: string, address?: string }[]): string {
    return assets.map((asset) => `${asset.symbol} - ${asset.address ? `Token deployed as ${asset.address}` : "Native token"}. Balance: ${asset.balance}. Value: ${asset.value} USD.`).join("\n");
  }

  async createCalldata(
    calls: CalldataWithDescription[]
  ): Promise<`0x${string}`> {
    const hash = await sha256(toHex(JSON.stringify(calls)));

    if (!(await this.runtime.setCache(`calldata:${hash}`, calls))) {
      throw new Error("Failed to save calldata in cache");
    }

    return hash;
  }

  async getCalldata(hash: `0x${string}`): Promise<CalldataWithDescription[]> {
    const cached = await this.runtime.getCache<CalldataWithDescription[]>(
      `calldata:${hash}`
    );

    if (!cached) {
      throw new Error("Calldata not found in cache");
    }

    return cached;
  }
}
