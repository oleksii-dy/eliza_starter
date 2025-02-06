import { MessageRelaxed, TonClient } from "@ton/ton";
import { WalletProvider } from "../../../providers/wallet";

export interface StakingPlatform {
  readonly tonClient: TonClient;
  readonly walletProvider: WalletProvider;
  getStakedTon(walletAddress: string, poolAddress: string): Promise<Number>;
  getPendingWithdrawal(walletAddress: string, poolAddress: string): Promise<Number>;
  getPoolInfo(poolAddress: string): Promise<any>;
  createStakeMessage(poolAddress: string, amount: number): Promise<MessageRelaxed>;
  createUnstakeMessage(poolAddress: string, amount: number): Promise<MessageRelaxed>;
}