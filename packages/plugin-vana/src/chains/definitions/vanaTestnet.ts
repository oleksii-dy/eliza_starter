import { defineChain } from "viem/utils";
import type { Chain } from "viem";

export const vanaTestnet: Chain = /*#__PURE__*/ defineChain({
  id: 14800,
  name: 'Vana Moksha Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'VANA',
    symbol: 'VANA',
  },
  rpcUrls: {
    default: { http: ['https://rpc.moksha.vana.org'] },
  },
  blockExplorers: {
    default: {
      name: 'vanaScan',
      url: 'https://moksha.vanascan.io',
      // apiUrl: 'https://api.bscscan.com/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xD8d2dFca27E8797fd779F8547166A2d3B29d360E',
      // blockCreated: 15921452,
    },
  },
})
