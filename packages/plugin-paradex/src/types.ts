import { State } from "@elizaos/core";

export interface BaseParadexState extends State {
    starknetAccount?: string;
    publicKey?: string;
    lastMessage?: string;
    jwtToken?: string;
    jwtExpiry?: number;
}