import {
    type Address,
    createPublicClient,
    getAddress,
    http,
    isAddress,
    type PublicClient,
} from "viem";
import { abstractTestnet, mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { elizaLogger } from "@elizaos/core";
import { ETH_ADDRESS,  } from "../constants";

// Shared clients
export const ethereumClient = createPublicClient({
    chain: mainnet,
    transport: http(),
});

export const abstractPublicClient = createPublicClient({
    chain: abstractTestnet,
    transport: http(),
});



// Helper to resolve ENS names
export async function resolveAddress(addressOrEns: string): Promise<Address | null> {
    if (isAddress(addressOrEns)) {
        return getAddress(addressOrEns);
    }

    let address:string
    try {
        const name = normalize(addressOrEns.trim());
        const resolved = await ethereumClient.getEnsAddress({ name });
        if (resolved) {
            address = resolved;
            elizaLogger.log(`Resolved ${name} to ${resolved}`);

        }
    } catch (error) {
        elizaLogger.error("Error resolving ENS name:", error);
    }


    return getAddress(address);

}

const tokens = [
    {
        address: ETH_ADDRESS,
        symbol: "ETH",
        decimals: 18,
    },
    {
        address: "0xe4c7fbb0a626ed208021ccaba6be1566905e2dfc",
        symbol: "USDC",
        decimals: 6,
    }
]

 export function getTokenByName(name: string) {

    const token = tokens.find(token => token.symbol.toLowerCase() === name.toLowerCase())

   return token
}


