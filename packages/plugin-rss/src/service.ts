import Parser from 'rss-parser';
import {
  ChannelType,
  EventType,
  type Content,
  type Entity,
  type IAgentRuntime,
  type Memory,
  MemoryType,
  Role,
  Service,
  type UUID,
  type World,
  createUniqueUuid,
  logger,
} from '@elizaos/core';

export const RSS_SERVICE_NAME = 'rss';

export class RSSService extends Service {
  static serviceType = RSS_SERVICE_NAME;
  capabilityDescription = 'The agent is able to ingest RSS feeds';
  private parser: Parser = new Parser();
  private feeds: string[];
  private timers: NodeJS.Timeout[] = [];
  private seenGuids: Map<string, Set<string>> = new Map();

  constructor(runtime: IAgentRuntime, feeds: string[]) {
    super(runtime);
    this.feeds = feeds;
  }

  static async start(runtime: IAgentRuntime): Promise<RSSService> {
    const feedSetting = (runtime.getSetting('RSS_FEEDS') as string) || '';
    const feeds = feedSetting
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    const service = new RSSService(runtime, feeds);
    service.startPolling();
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    const service = runtime.getService(RSS_SERVICE_NAME) as RSSService | undefined;
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  private startPolling(interval = 5 * 60 * 1000) {
    for (const feed of this.feeds) {
      this.pollFeed(feed); // initial
      const timer = setInterval(() => this.pollFeed(feed), interval);
      this.timers.push(timer);
    }
  }

  private async pollFeed(feedUrl: string) {
    try {
      const feed = await this.parser.parseURL(feedUrl);
      const guidSet = this.seenGuids.get(feedUrl) || new Set<string>();
      for (const item of feed.items ?? []) {
        const guid = (item.guid || item.link || `${item.title}-${item.pubDate}`) as string;
        if (guid && guidSet.has(guid)) continue;
        guidSet.add(guid);
        this.seenGuids.set(feedUrl, guidSet);
        await this.recordItem(feedUrl, feed.title ?? feedUrl, item);
      }
    } catch (error) {
      logger.error('RSS fetch failed', feedUrl, error);
    }
  }

  private async recordItem(feedUrl: string, feedTitle: string, item: Parser.Item) {
    const worldId = createUniqueUuid(this.runtime, feedUrl) as UUID;
    await this.runtime.ensureWorldExists({
      id: worldId,
      name: feedTitle,
      agentId: this.runtime.agentId,
      serverId: feedUrl,
      metadata: { rss: { url: feedUrl } },
    } as World);

    const roomId = createUniqueUuid(this.runtime, `${feedUrl}-room`) as UUID;
    await this.runtime.ensureRoomExists({
      id: roomId,
      name: feedTitle,
      source: 'rss',
      type: ChannelType.FEED,
      channelId: feedUrl,
      serverId: feedUrl,
      worldId,
    });

    const entityId = createUniqueUuid(this.runtime, feedUrl) as UUID;
    const existing = await this.runtime.getEntityById(entityId);
    if (!existing) {
      const entity: Entity = {
        id: entityId,
        agentId: this.runtime.agentId,
        names: [feedTitle],
        metadata: { rss: { url: feedUrl } },
      };
      await this.runtime.createEntity(entity);
    }
    await this.runtime.ensureParticipantInRoom(entityId, roomId);

    const content: Content = {
      text: item.title ?? '',
      url: item.link,
      source: 'rss',
    };

    const memory: Memory = {
      entityId,
      agentId: this.runtime.agentId,
      roomId,
      worldId,
      content,
      metadata: {
        type: MemoryType.DOCUMENT,
        source: 'rss',
        categories: item.categories,
        published: item.pubDate,
      },
    };

    await this.runtime.createMemory(memory, 'documents');
    this.runtime.emitEvent([EventType.MESSAGE_RECEIVED], {
      runtime: this.runtime,
      memory,
      source: 'rss',
    });
  }
}
