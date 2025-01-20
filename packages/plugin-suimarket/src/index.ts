import { Plugin } from '@elizaos/core';
import { coinInfo } from './actions/coinInfo';
import { trendingCat } from './actions/trendingCat';
import { trendingNft } from "./actions/trendingNft";
import { nftInfo } from "./actions/nftInfo";
import { topMarkets } from "./actions/topMarkets";
import {  trendingTokens} from "./actions/trendingCoins";
import { topAiTokens } from './actions/topAiTokens';
import {  suiTrendingPools} from "./actions/suiTrendingPools";
import { searchSuiTokenSymbol } from './actions/searchSuiTokenSymbol';
import { suiTokenInfo } from './actions/suiTokenInfo';
import { executeSwap } from './actions/swapBySymbol';
import { executeSwapByAddress } from './actions/swapByAddress';
import { sendTokenBySymbol } from './actions/sendTokenBySymbol';

const suimarketPlugin: Plugin = {
  name: "coingecko",
  description: "Everything about crypyo market infomation",
  actions: [
    topMarkets,
    trendingCat,
    trendingTokens,
    coinInfo,
    trendingNft,
    nftInfo,
    topAiTokens,
    suiTrendingPools,
    searchSuiTokenSymbol,
    suiTokenInfo,
    executeSwap,
    executeSwapByAddress,
    sendTokenBySymbol
],
  evaluators: [],
  providers: []
};

export default suimarketPlugin;
export {suimarketPlugin as suimarketPlugin };
