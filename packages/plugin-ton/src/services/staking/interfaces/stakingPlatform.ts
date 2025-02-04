import { MessageRelaxed, TonClient } from "@ton/ton";

export interface StakingPlatform {
  getPoolInfo(client: TonClient, poolAddress: string): Promise<any>;
  createStakeMessage(client: TonClient, poolAddress: string, amount: number): Promise<MessageRelaxed>;
  createUnstakeMessage(client: TonClient, poolAddress: string, amount: number): Promise<MessageRelaxed>;
}