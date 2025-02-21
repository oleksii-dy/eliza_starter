import { ec, shortString, typedData as starkTypedData, hash } from "starknet";
import BigNumber from "bignumber.js";
import { SystemConfig, Account } from "./paradex-ts/types";
import { signAuthRequest } from "./paradex-ts/signature";

const DOMAIN_TYPES = {
    StarkNetDomain: [
        { name: "name", type: "felt" },
        { name: "chainId", type: "felt" },
        { name: "version", type: "felt" },
    ],
};

// Get Paradex API URL based on network
export function getParadexUrl(): string {   //todo: remove
    const network = (process.env.PARADEX_NETWORK || "testnet").toLowerCase();
    if (network !== "testnet" && network !== "prod") {
        throw new Error("PARADEX_NETWORK must be either 'testnet' or 'prod'");
    }
    return `https://api.${network}.paradex.trade/v1`;
}

export function getParadexConfig(): SystemConfig {
    const network = process.env.PARADEX_NETWORK?.toLowerCase();

    let apiBaseUrl: string;
    let chainId: string;

    if (network === "prod") {
        apiBaseUrl = "https://api.prod.paradex.trade/v1";
        chainId = shortString.encodeShortString("PRIVATE_SN_PARACLEAR_MAINNET");
    } else if (network === "testnet") {
        apiBaseUrl = "https://api.testnet.paradex.trade/v1";
        chainId = shortString.encodeShortString("PRIVATE_SN_POTC_SEPOLIA");
    } else {
        throw new Error(
            "Invalid PARADEX_NETWORK. Please set it to 'prod' or 'testnet'.",
        );
    }

    return { apiBaseUrl, starknet: { chainId } };
}

export class ParadexError extends Error {
    constructor(
        message: string,
        public details?: any,
    ) {
        super(message);
        this.name = "ParadexError";
    }
}

interface FetchError extends Error {
    status?: number;
    statusText?: string;
    response?: any;
}

function handleError(error: FetchError) {
    console.error("API Error:", {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        response: error.response,
    });
    throw error;
}

export interface Order {
    market: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT";
    size: string;
    price?: string;
    instruction: "GTC" | "FOK" | "IOC" | "POST";
    client_id: string;
    signature?: string;
    signature_timestamp: number;
}
