import type { Plugin } from '@elizaos/core';
import { RSSService, RSS_SERVICE_NAME } from './service';
import { rssInterestEvaluator } from './evaluators/interest';

const rssPlugin: Plugin = {
  name: RSS_SERVICE_NAME,
  description: 'RSS feed ingestion service',
  services: [RSSService],
  evaluators: [rssInterestEvaluator],
};

export default rssPlugin;
export { RSSService } from './service';
export { rssInterestEvaluator } from './evaluators/interest';
