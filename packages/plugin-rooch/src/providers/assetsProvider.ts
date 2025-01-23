import BigNumber from "bignumber.js";
import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    settings
} from "@elizaos/core";
import {
    getRoochNodeUrl,
    NetworkType,
    RoochClient,
    Address,
    PaginatedUTXOStateViews,
    IndexerStateIDView,
    PaginatedBalanceInfoViews,
} from '@roochnetwork/rooch-sdk/dist/esm';
import {
    BTCUTXO,
    RoochCoin
} from "../types";
import {
    parseBitcoinAddress,
} from "../utils";

export class Assets {
    utxos: Array<BTCUTXO>
    coins: Array<RoochCoin>
}

export class AssetsProvider {
    private roochClient: RoochClient
    private address: Address

    constructor(roochClient: RoochClient, address: Address) {
        this.roochClient = roochClient;
        this.address = address;
    }

    async fetchBTCUTXOs(): Promise<Array<BTCUTXO>> {
        try {
            const limit = 100
            let cursor: IndexerStateIDView | null = null
            const allUTXOs = new Array<BTCUTXO>();

            while (true) {
                const response: PaginatedUTXOStateViews = await this.roochClient.queryUTXO({
                    filter: {
                        owner: this.address.toStr(),
                    },
                    cursor: cursor,
                    limit: limit.toString(),
                })

                for (const utxo of response.data) {
                    allUTXOs.push({
                        utxo: utxo.id,
                        sats: utxo.value.value
                    })
                }

                if (!response.has_next_page || !response.next_cursor) {
                    break
                }

                cursor = response.next_cursor
            }

            return allUTXOs;
        } catch (error) {
            console.error("Error fetching UTXOs:", error);
            throw error;
        }
    }

    async fetchRoochCoins(): Promise<Array<RoochCoin>> {
        try {
            const limit = 100
            let cursor: IndexerStateIDView | null = null
            const allCoins = new Array<RoochCoin>();

            while (true) {
                const response: PaginatedBalanceInfoViews = await this.roochClient.getBalances({
                    owner: this.address.toStr(),
                    cursor: cursor,
                    limit: limit.toString(),
                })

                for (const coin of response.data) {
                    allCoins.push({
                        symbol: coin.symbol,
                        name: coin.name,
                        balance: coin.fixedBalance
                    })
                }

                if (!response.has_next_page || !response.next_cursor) {
                    break
                }

                cursor = response.next_cursor
            }

            return allCoins;
        } catch (error) {
            console.error("Error fetching UTXOs:", error);
            throw error;
        }
    }

    async fetchAssets(): Promise<Assets> {
        try {
            const assets = new Assets();
            assets.utxos = await this.fetchBTCUTXOs();
            assets.coins = await this.fetchRoochCoins();
            return assets
        } catch (error) {
            console.error("Error fetching portfolio:", error);
            throw error;
        }
    }

    formatAssets(runtime, assets: Assets): string {
        let output = `${runtime.character.name}\n`;
        output += `Assets(${this.address}): \n`;

        output += "Rooch network coin assets:\n"
        for (const coin of assets.coins) {
            const coinBalanceFormatted = new BigNumber(coin.balance).toFixed(2);
            output += `${coin.symbol}(${coin.name}) Balance:${coinBalanceFormatted}\n`
        }

        output += "BTC assets:"
        for (const utxo of assets.utxos) {
            const satsFormatted = new BigNumber(utxo.sats).toFixed(2);
            output += `UTXO(${utxo.utxo}) ${satsFormatted} Sats\n`
        }

        return output;
    }

    async getFormattedAssets(runtime): Promise<string> {
        try {
            const assets = await this.fetchAssets();
            return this.formatAssets(runtime, assets);
        } catch (error) {
            console.error("Error generating assets report:", error);
            return "Unable to fetch wallet information. Please try again later.";
        }
    }
}

export const assetsProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        const roochAddress = parseBitcoinAddress(runtime);

        try {
            const url = getRoochNodeUrl(settings["ROOCH_NETWORK"] as NetworkType);
            elizaLogger.info(
                `getRoochNodeUrl:  ${url}`
            );

            const roochClient = new RoochClient({ url: url })
            const provider = new AssetsProvider(roochClient, roochAddress)

            return await provider.getFormattedAssets(runtime);
        } catch (error) {
            console.error("Error in assets provider:", error);
            return error;
        }
    },
};
