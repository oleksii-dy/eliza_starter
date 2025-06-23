import type { Plugin } from '@elizaos/core';
import { TrustService } from './service';
import { trustProvider } from './provider';

export const trustPlugin: Plugin = {
  name: '@elizaos/plugin-trust',
  description: 'Trust module for reputation tracking',
  services: [TrustService],
  providers: [trustProvider],
};

export default trustPlugin;
export { TrustService, trustProvider };
