import {
  type Chain,
  createPublicClient,
  erc20Abi,
  fallback,
  getAddress,
  http,
  isHex,
  type PublicClient,
  type Transport,
} from "viem";
import { mainnet, base, arbitrum } from "viem/chains";
import type { TokenData } from "../types";

const clients: Record<number, PublicClient<Transport, Chain, undefined>> = {};
const endpoints: Record<number, string[] | undefined> = {
  1: [
    "https://eth.llamarpc.com",
    "https://0xrpc.io/eth",
    "https://rpc.mevblocker.io",
    "https://eth.drpc.org",
  ],
  8453: [
    "https://base.llamarpc.com",
    "https://base.meowrpc.com",
    "https://base.drpc.org",
  ],
  42161: [
    "https://arbitrum-one-rpc.publicnode.com",
    "https://arbitrum.blockpi.network/v1/rpc/public",
    "https://arbitrum.meowrpc.com",
    "https://arbitrum.drpc.org",
  ],
};

export const getChain = (chainId: number = 1) => {
  switch (chainId) {
    case 1:
      return mainnet;
    case 8453:
      return base;
    case 42161:
      return arbitrum;
    default:
      throw new Error(`Unsupported chain id: ${chainId}`);
  }
};

export const getClient = (chain: Chain) => {
  if (!clients[chain.id]) {
    const rpcs = endpoints[chain.id];

    if (!rpcs?.length) {
      throw new Error(`No endpoints found for chain id: ${chain.id}`);
    }

    const client = createPublicClient<Transport, Chain, undefined>({
      chain,
      transport: fallback(rpcs.map((rpc) => http(rpc))),
    }) as PublicClient<Transport, Chain, undefined>;

    clients[chain.id] = client;
  }

  return clients[chain.id];
};

export const getTokenData = async (
  chainId?: number,
  address?: `0x${string}`
): Promise<TokenData> => {
  const chain = getChain(chainId);

  if (!address) {
    const { name, symbol, decimals } = chain.nativeCurrency;
    return { name, symbol, decimals };
  }

  const client = getClient(chain);

  const [name, symbol, decimals] = await Promise.all([
    client.readContract({
      address,
      abi: erc20Abi,
      functionName: "name",
    }),
    client.readContract({
      address,
      abi: erc20Abi,
      functionName: "symbol",
    }),
    client.readContract({
      address,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);

  return { address: getAddress(address), name, symbol, decimals };
};



export const extractTokenData = (
  obj?: Record<string, unknown>
): TokenData | undefined => {
  const { address, decimals, symbol, name } = obj ?? {};

  if (address && !isHex(address)) {
    return;
  }

  if (typeof symbol !== "string") {
    return;
  }

  if (typeof name !== "string") {
    return;
  }

  if (typeof decimals !== "number") {
    return;
  }

  return { address, decimals, symbol, name };
};