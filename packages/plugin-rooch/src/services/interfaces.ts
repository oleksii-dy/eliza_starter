import { Assets, RoochCoin, TransferParams, TransferResult } from '../types';
import { IAgentRuntime, Memory, State } from "@elizaos/core";

export interface IAssetsProvider {
    get(runtime: IAgentRuntime, message: Memory, state: State): Promise<Assets>;
}

export interface IRoochTransferService {
    transfer(params: TransferParams): Promise<TransferResult>;
    validateTransfer(params: TransferParams): Promise<boolean>;
    getCoinInfo(symbol: string, index?: number): Promise<RoochCoin | undefined>;
}