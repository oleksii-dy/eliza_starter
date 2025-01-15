import fetch from 'node-fetch';
import type {IAgentRuntime} from "@elizaos/core";

export const initBtcFunProvider = (runtime: IAgentRuntime) => {

    const btcfunApiURL = runtime.getSetting("BTCFUN_API_URL") ?? process.env.BTCFUN_API_URL
    if (!btcfunApiURL) {
        throw new Error("BTCFUN_API_URL is not set");
    }

    return new BtcfunProvider(btcfunApiURL);
};

export class BtcfunProvider {
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    async validateBrc20(address: string, ticker: string) {
        const response = await fetch(`${this.apiUrl}/api/v1/import/brc20_validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: address,
                ticker: ticker,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        return response.json();
    }

    async createBrc20Order(paymentFromPubKey: string, paymentFrom: string, ordinalsFromPubKey: string, ordinalsFrom: string, feeRate: number, tick: string, addressFundraisingCap: string, mintDeadline: number, mintCap: string) {
        const response = await fetch(`${this.apiUrl}/api/v1/import/brc20_order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                payment_from_pub_key: paymentFromPubKey,
                payment_from: paymentFrom,
                ordinals_from_pub_key: ordinalsFromPubKey,
                ordinals_from: ordinalsFrom,
                fee_rate: feeRate,
                tick: tick,
                address_fundraising_cap: addressFundraisingCap,
                mint_deadline: mintDeadline,
                mint_cap: mintCap,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.code === "OK" && result.data) {
            const { order_id, psbt_hex } = result.data;
            return { order_id, psbt_hex };
        } else {
            console.log("Invalid response", result)
            throw new Error("Invalid response");
        }
    }

    async broadcastOrder(orderId: string, signedPsbtHex: string) {
        const response = await fetch(`${this.apiUrl}/api/v1/import/broadcast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                order_id: orderId,
                signed_psbt_hex: signedPsbtHex,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        return response.json();
    }
}
