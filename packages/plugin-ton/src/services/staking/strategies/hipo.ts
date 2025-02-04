import { Address, beginCell, Cell, MessageRelaxed, toNano, TonClient } from "@ton/ton";
import { StakingPlatform } from "../interfaces/stakingPlatform.ts";
import { internal } from "@ton/ton";
import { Treasury } from "@hipo-finance/sdk"
import { WalletProvider } from "../../../providers/wallet.ts";

interface IntMessage {
    to: String,
    value: bigint,
    body: Cell,
    bounce: Boolean | null,
    init: any | null,
}

async function getTreasuryState(tonClient: TonClient, treasuryAddress: Address) {
    const treasury = tonClient.open(Treasury.createFromAddress(treasuryAddress))
    return treasury.getTreasuryState()
}

async function getExchangeRate(tonClient: TonClient, treasuryAddress: Address) : Promise<Number> {
    const treasuryState = await getTreasuryState(tonClient, treasuryAddress);
    return Number(treasuryState.totalTokens) / Number(treasuryState.totalCoins)

}


export class HipoStrategy implements StakingPlatform {
    async getPoolInfo(client: TonClient, poolAddress: string): Promise<any> {
        try {
            const result = await getTreasuryState(client, Address.parse(poolAddress));
            
            return result;
        } catch (error) {
            console.error("Error fetching Hipo pool info:", error);
            throw error;
        }
    }

    async createStakeMessage(client: TonClient, poolAddress: string, amount: number): Promise<MessageRelaxed> {
        const payload = beginCell()
            .storeUint(0x3d3761a6, 32)
            .storeUint(0n, 64)
            .storeAddress(null)
            .storeCoins(toNano(amount))
            .storeCoins(1n)
            .storeAddress(null)
            .endCell();

        const intMessage = internal({
            to: poolAddress,
            value: toNano(amount) + 100000000n,
            body: payload,
            bounce: true,
            init: null,
        });

        return intMessage;
    }

    async createUnstakeMessage(client: TonClient, poolAddress: string, amount: number): Promise<MessageRelaxed> {
        const rate = await getExchangeRate(client, Address.parse(poolAddress)) as number;
        
        const jettonAmount = amount * rate;

        const payload = beginCell()
            .storeUint(0x595f07bc, 32)
            .storeUint(0n, 64)
            .storeCoins(toNano(jettonAmount))
            .storeAddress(undefined)
            .storeMaybeRef(beginCell().storeUint(0, 4).storeCoins(1n))
            .endCell();
    
        const intMessage = internal({
            to: poolAddress,
            value: 100000000n,
            body: payload,
            bounce: true,
            init: null,
        });

        return intMessage;
    }
}