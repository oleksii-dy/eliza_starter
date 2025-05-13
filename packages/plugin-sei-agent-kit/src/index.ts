import type { Plugin } from "@elizaos/core";

import { 
    getBalanceERC20Action,
    getBalanceERC721Action,
    transferERC20Action,
    transferERC721Action,
    mintERC721Action,
    symphonySwapAction,
    siloStakeAction,
    siloUnstakeAction,
    dexscreenerGetTokenAddressAction,
    mintTakaraAction,
    borrowTakaraAction,
    repayTakaraAction,
    redeemTakaraAction,
    getRedeemableAmountAction,
    getBorrowBalanceAction,
    addDragonSwapLiquidityAction,
    removeDragonSwapLiquidityAction
} from "./actions";

export const seiAgentkitPlugin: Plugin = {
    name: "sei",
    description: "SEI Plugin with sei agent kit for Eliza that enables interaction with the SEI blockchain, including checking wallet balances and performing token transfers between addresses. Provides core functionality for managing SEI assets and transactions and integrations with all the protocols built on SEI.",
    actions: [
        // ERC20 actions
        getBalanceERC20Action,
        transferERC20Action,

        // ERC721 actions
        getBalanceERC721Action,
        transferERC721Action,
        mintERC721Action,

        // Symphony actions
        symphonySwapAction,

        // Silo actions
        siloStakeAction,
        siloUnstakeAction,

        // DexScreener actions
        dexscreenerGetTokenAddressAction,

        // Takara actions
        mintTakaraAction,
        borrowTakaraAction,
        repayTakaraAction,
        redeemTakaraAction,
        getRedeemableAmountAction,
        getBorrowBalanceAction,

        // DragonSwap actions
        addDragonSwapLiquidityAction,
        removeDragonSwapLiquidityAction
    ],
    evaluators: [],
    providers: [],
};

export default seiAgentkitPlugin;