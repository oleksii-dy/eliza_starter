import { Assets, RoochCoin } from '../../types';
import { TransferParams, TransferResult } from '../../actions/transfer/types';
import { IAgentRuntime, Memory, State } from "@elizaos/core";

export interface IAssetsProvider {
    get(runtime: IAgentRuntime, message: Memory, state: State): Promise<Assets>;
}

export interface IRoochTransferService {
    transfer(params: TransferParams): Promise<TransferResult>;
    validateTransfer(params: TransferParams): Promise<boolean>;
    getCoinInfo(symbol: string, index?: number): Promise<RoochCoin | undefined>;
}