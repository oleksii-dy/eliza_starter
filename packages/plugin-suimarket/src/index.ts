import { Plugin } from '@elizaos/core';
import { tokenInfo } from './actions/tokenInfo';
import { birdEyeProvider } from './providers/birdEyeProvider';
import { suiWalletProvider } from "./providers/suiWalletProvider";
import { trendingCat } from './actions/trendingCategories';
import { nftList } from "./actions/nftList";
import { memeSui } from "./actions/memeSui";

const suimarketPlugin: Plugin = {
  name: "coingecko",
  description: "everything about marketdata from coingecko",
  actions: [tokenInfo, trendingCat, nftList, memeSui],
  evaluators: [],
  providers: []
};

export default suimarketPlugin;
export {suimarketPlugin as suimarketPlugin };
