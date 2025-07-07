import { Service } from "@elizaos/core";
import { IBrowserService as IBrowserServiceV1 } from "@elizaos/core/v1";
import { CalldataWithDescription } from "./tx";

export interface ILevvaService extends Service {
  getWalletAssets(params: {
    address: `0x${string}`;
    chainId: number;
  }): Promise<{ symbol: string, balance: string, value: string, address?: string }[]>;
  formatWalletAssets(assets: { symbol: string, balance: string, value: string, address?: string }[]): string;
  createCalldata(calls: CalldataWithDescription[]): Promise<`0x${string}`>;
  getCalldata(hash: `0x${string}`): Promise<CalldataWithDescription[]>;
}

// service defined in @elizaos/plugin-browser
export interface IBrowserService
  extends Service,
    Pick<IBrowserServiceV1, "getPageContent"> {}
