import type { Plugin } from "@elizaos/core";

import { getBalanceERC20Action } from "./actions/erc20/get_balance.js";
import { getBalanceERC721Action } from "./actions/erc721/get_balance.js";
import { transferERC20Action } from "./actions/erc20/transfer.js";
import { transferERC721Action } from "./actions/erc721/transfer.js";
import { mintERC721Action } from "./actions/erc721/mint.js";

// Import new Symphony actions
import { symphonySwapAction } from "./actions/symphony/swap.js";

// Import new Silo actions
import { siloStakeAction } from "./actions/silo/stake.js";
import { siloUnstakeAction } from "./actions/silo/unstake.js";

// Import new DexScreener actions
import { dexscreenerGetTokenAddressAction } from "./actions/dexscreener/get_token_address.js";


// Import Takara actions
import { mintTakaraAction } from "./actions/takara/mint.js";
import { borrowTakaraAction } from "./actions/takara/borrow.js";
import { repayTakaraAction } from "./actions/takara/repay.js";
import { redeemTakaraAction } from "./actions/takara/redeem.js";
import { getRedeemableAmountAction } from "./actions/takara/get_redeemable_amount.js";
import { getBorrowBalanceAction } from "./actions/takara/get_borrow_balance.js";

// Import DragonSwap actions
import { addDragonSwapLiquidityAction } from "./actions/dragonswap/add_liquidity.js";
import { removeDragonSwapLiquidityAction } from "./actions/dragonswap/remove_liquidity.js";

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