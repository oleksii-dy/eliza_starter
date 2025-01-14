import { Plugin } from '@elizaos/core';
import { tokenInfo } from './actions/tokenInfo';
import { trendingCat } from './actions/trendingCat';
import { trendingNft } from "./actions/trendingNft";
import { memeSui } from "./actions/memeSui";
import { nftInfo } from "./actions/nftInfo";
import { topMarkets } from "./actions/topMarkets";
import {  trendingTokens} from "./actions/trendingTokens";
import { topAiTokens } from './actions/topAiTokens';

const suimarketPlugin: Plugin = {
  name: "coingecko",
  description: "Everything about crypyo market infomation",
  actions: [topMarkets, trendingCat, trendingTokens, tokenInfo, trendingNft, nftInfo, topAiTokens, memeSui],
  evaluators: [],
  providers: []
};

export default suimarketPlugin;
export {suimarketPlugin as suimarketPlugin };
