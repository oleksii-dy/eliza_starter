import { Plugin } from '@elizaos/core';
// import { coinInfo } from './actions/coinInfo';
// import { trendingCat } from './actions/trendingCat';
// import { topMarkets } from "./actions/topMarkets";
// import {  trendingTokens} from "./actions/trendingCoins";
// import { topAiTokens } from './actions/topAiTokens';
// import { searchSuiTokenSymbol } from './actions/searchSuiTokenSymbol';
import { suiTokenPriceByAddress } from './actions/suiTokenPriceByAddress';
import { executeSwap } from './actions/swapBySymbol';
import { executeSwapByAddress } from './actions/swapByAddress';
import { sendTokenBySymbol } from './actions/sendTokenBySymbol';
import { checkTxhashOnSui } from './actions/checkInfoTxHash';
// import { chainInfo } from './actions/infoChain';
import { projectInfo } from './actions/projectCoinOverview';
import { topDexInfo } from './actions/topDexByNetwork';
// import { sui } from './actions/suiTokenInfoBySymbol';
import { suiTokenPriceBySymbol } from './actions/suiTokenPriceBySymbol';
import { topMeme } from './actions/topMeMeToken';
import { topDefi } from './actions/topDefiToken';

const suimarketPlugin: Plugin = {
  name: "suimarketPlugin",
  description: "Everything about Sui blockchain",
  actions: [
    // chainInfo,
    // topMarkets,
    // trendingTokens,
    // coinInfo,
    // topAiTokens,
    // searchSuiTokenSymbol,
    // suiTokenInfo,
    executeSwap,
    executeSwapByAddress,
    sendTokenBySymbol,
    checkTxhashOnSui,
    projectInfo,
    // suiTokenInfoBySymbol,
    topDexInfo,
    suiTokenPriceBySymbol,
    suiTokenPriceByAddress,
    topMeme,
    topDefi

],
  evaluators: [],
  providers: []
};

export default suimarketPlugin;
export {suimarketPlugin as suimarketPlugin };
