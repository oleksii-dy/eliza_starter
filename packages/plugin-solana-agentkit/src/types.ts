import { Content } from "@elizaos/core";

export interface flashTradeContent extends Content {
    token: string;
    side: "long" | "short";
    collateralUsd: number;
    leverage: number;
}
