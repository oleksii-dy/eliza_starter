import { Address, beginCell, MessageRelaxed, toNano, TonClient } from "@ton/ton";
import { StakingPlatform } from "../interfaces/stakingPlatform.ts";
import { internal } from "@ton/ton";

function generateQueryId() {
    // Generate a query ID that's unique for this transaction
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

export class TonWhalesStrategy implements StakingPlatform {
    async getPoolInfo(client: TonClient, poolAddress: string): Promise<any> {
        try {
            const result = await client.runMethod(
                Address.parse(poolAddress), 
                "get_pool_status"
            );
            
            // Parse the stack result based on TonWhales contract structure
            const status = result.stack;
            return {
                totalStaked: status.readBigNumber(),
                hasWithdraw: status.readBoolean(),
                withdrawRequests: status.readNumber(),
                nextRoundSince: status.readNumber(),
                stakeHeld: status.readNumber(),
                minStake: BigInt(10_000_000_000), // 10 TON in nanotons
                apy: 5.2 // Fixed APY for TonWhales
            };
        } catch (error) {
            console.error("Error fetching TonWhales pool info:", error);
            throw error;
        }
    }

        async createStakeMessage(client: TonClient, poolAddress: string, amount: number): Promise<MessageRelaxed> {
            const queryId = generateQueryId();
    
            const payload = beginCell()
                .storeUint(2077040623, 32) 
                .storeUint(queryId, 64)    
                .storeCoins(100000)  // gas
                .endCell();
    
            const intMessage = internal({
                to: poolAddress,
                value: toNano(amount),
                bounce: true,
                init: null,
                body: payload,
            });
    
            return intMessage;
        }
    
        async createUnstakeMessage(client: TonClient, poolAddress: string, amount: number): Promise<MessageRelaxed> {
            const queryId = generateQueryId();
    
            const payload = beginCell()
                .storeUint(3665837821, 32) 
                .storeUint(queryId, 64)    
                .storeCoins(100000) // gas
                .storeCoins(amount)
                .endCell();
            
            const intMessage = internal({
                to: poolAddress,
                value: 200000000n,//toNano(unstakeAmount),
                bounce: true,
                init: null,
                body: payload, // Adjust this message if your staking contract requires a different format.
            });
    
            return intMessage;
        }
}