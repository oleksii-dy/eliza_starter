import type { Plugin, IAgentRuntime } from '@elizaos/core';

import { RaydiumService } from './services/srv_raydium';

export const raydiumPlugin: Plugin = {
  name: 'raydiumOS',
  description: 'raydium plugin',
  actions: [],
  evaluators: [],
  providers: [],
  services: [RaydiumService],
  init: async (_, runtime: IAgentRuntime) => {
    console.log('raydium init');

    const asking = 'raydium';
    const serviceType = 'solana';
    let solanaService = runtime.getService(serviceType) as any;
    while (!solanaService) {
      console.log(asking, 'waiting for', serviceType, 'service...');
      solanaService = runtime.getService(serviceType) as any;
      if (!solanaService) {
        await new Promise((waitResolve) => setTimeout(waitResolve, 1000));
      } else {
        console.log(asking, 'Acquired', serviceType, 'service...');
      }
    }

    const me = {
      name: 'Raydium DEX services',
    };
    solanaService.registerExchange(me);

    console.log('raydium init done');
  },
};

export default raydiumPlugin;
