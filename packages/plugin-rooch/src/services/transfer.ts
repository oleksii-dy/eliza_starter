import { IAgentRuntime } from "@elizaos/core";
import {
    RoochClient,
    RoochTransport,
    isValidAddress,
    Secp256k1Keypair,
} from "@roochnetwork/rooch-sdk/dist/esm";
import BigNumber from "bignumber.js";
import { IAssetsProvider, IRoochTransferService } from './interfaces';
import { parseKeypair } from "../utils";
import { Assets, RoochCoin, TransferParams, TransferResult } from '../types';

export class TransferService implements IRoochTransferService {
  private assets: Assets;
  private roochClient: RoochClient;

  constructor(
    private readonly assetsProvider: IAssetsProvider,
    private readonly runtime: IAgentRuntime,
    private readonly transport: RoochTransport
  ) {
    this.roochClient = new RoochClient({ transport });
  }

  async transfer(params: TransferParams): Promise<TransferResult> {
    try {
      const isValid = await this.validateTransfer(params);
      if (!isValid) {
        return { success: false, error: "Invalid transfer parameters" };
      }

      const symbol = params.symbol || "RGAS";
      const coinInfo = await this.getCoinInfo(symbol, params.index);

      if (!coinInfo) {
        return {
          success: false,
          error: `Coin ${symbol}${params.index ? ` at index ${params.index}` : ''} not found`
        };
      }

      const amount = this.calculateAmount(params.amount, coinInfo.decimals);
      const transferBalance = new BigNumber(coinInfo.balance);

      if (transferBalance.isLessThan(amount)) {
        return { success: false, error: `Insufficient ${symbol} balance` };
      }

      const result = await this.executeTransfer(params.recipient, amount, coinInfo);

      return {
        success: result.execution_info.status.type === "executed",
        txOrder: result.sequence_info.tx_order,
        error: result.execution_info.status.type !== "executed"
          ? `Transfer failed: ${result.execution_info.status.type}`
          : undefined
      };
    } catch (error) {
      return { success: false, error: `Transfer failed: ${error.message}` };
    }
  }

  async validateTransfer(params: TransferParams): Promise<boolean> {
    if (!isValidAddress(params.recipient)) {
      return false;
    }

    this.assets = await this.assetsProvider.get(this.runtime, null, null);
    return true;
  }

  async getCoinInfo(symbol: string, index?: number): Promise<RoochCoin | undefined> {
    const matchingCoins = this.assets.coins.filter(coin => coin.symbol === symbol);
    if (matchingCoins.length === 0) return undefined;

    if (index !== undefined) {
      const adjustedIndex = index - 1;
      return adjustedIndex >= 0 && adjustedIndex < matchingCoins.length
        ? matchingCoins[adjustedIndex]
        : undefined;
    }

    return matchingCoins[0];
  }

  private calculateAmount(amount: string | number, decimals: number): number {
    return new BigNumber(amount)
      .multipliedBy(new BigNumber(10).pow(decimals))
      .integerValue(BigNumber.ROUND_FLOOR)
      .toNumber();
  }

  private async executeTransfer(recipient: string, amount: number, coinInfo: RoochCoin) {
    const parsedKeypair = parseKeypair(this.runtime);
    const keypair = Secp256k1Keypair.fromSecretKey(parsedKeypair.secretKey, false);

    return this.roochClient.transfer({
      signer: keypair,
      recipient,
      amount,
      coinType: {
        target: coinInfo.coinType,
      },
    });
  }
}