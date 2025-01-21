import { Plugin } from '@elizaos/core';
import { coinInfo } from './actions/coinInfo';
import { trendingCat } from './actions/trendingCat';
import { topMarkets } from "./actions/topMarkets";
import {  trendingTokens} from "./actions/trendingCoins";
import { topAiTokens } from './actions/topAiTokens';
import { searchSuiTokenSymbol } from './actions/searchSuiTokenSymbol';
import { suiTokenInfo } from './actions/suiTokenInfo';
import { executeSwap } from './actions/swapBySymbol';
import { executeSwapByAddress } from './actions/swapByAddress';
import { sendTokenBySymbol } from './actions/sendTokenBySymbol';
import { checkTxhashOnSui } from './actions/checkInfoTxHash';
import { chainInfo } from './actions/infoChain';

const suimarketPlugin: Plugin = {
  name: "suimarketPlugin",
  description: "Everything about Sui blockchain",
  actions: [
    chainInfo,
    topMarkets,
    trendingTokens,
    coinInfo,
    // topAiTokens,
    searchSuiTokenSymbol,
    suiTokenInfo,
    executeSwap,
    executeSwapByAddress,
    sendTokenBySymbol,
    checkTxhashOnSui,
],
  evaluators: [],
  providers: []
};

export default suimarketPlugin;
export {suimarketPlugin as suimarketPlugin };
