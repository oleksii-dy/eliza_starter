/**
 * Platform Registry Service for ElizaOS
 * Enhanced registry supporting plugins, MCPs, and workflows with platform features
 */

import { Service, IAgentRuntime, elizaLogger } from '@elizaos/core';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import type {
  RegistryItem,
  PluginRegistryItem,
  MCPRegistryItem,
  WorkflowRegistryItem,
  RegistryQuery,
  RegistrySearchResult,
  CreateRegistryItemRequest,
  UpdateRegistryItemRequest,
  RegistryBuildRequest,
  RegistryBuildStatus,
  PlatformStats,
  RegistryItemType,
  RegistryAuthor,
  RegistryAnalytics,
  RegistryCollection,
} from '../types/registry.js';

interface PlatformDatabase {
  items: RegistryItem[];
  buildJobs: RegistryBuildStatus[];
  collections: RegistryCollection[];
  analytics: Record<string, RegistryAnalytics>;
  stats: PlatformStats;
  version: string;
  lastUpdated: Date;
}

export class PlatformRegistryService extends Service {
  static serviceName = 'platform-registry';

  capabilityDescription =
    'Enhanced registry service supporting plugins, MCPs, and workflows with AI-powered platform features';

  private database: PlatformDatabase;
  private databasePath: string;
  protected runtime: IAgentRuntime;
  private initialized = false;

  constructor() {
    super();
    this.databasePath =
      process.env.PLATFORM_REGISTRY_DB_PATH ||
      join(process.cwd(), 'data', 'platform-registry.json');
    this.database = {
      items: [],
      buildJobs: [],
      collections: [],
      analytics: {},
      stats: this.createEmptyStats(),
      version: '1.0.0',
      lastUpdated: new Date(),
    };
    // Initialize runtime placeholder - will be set in start()
    this.runtime = {} as IAgentRuntime;
  }

  static async start(runtime: IAgentRuntime): Promise<PlatformRegistryService> {
    const service = new PlatformRegistryService();
    service.runtime = runtime;
    await service.initialize();
    return service;
  }

  async stop(): Promise<void> {
    if (this.initialized) {
      this.saveDatabase();
      elizaLogger.info('Platform Registry Service stopped');
    }
  }

  private async initialize(): Promise<void> {
    try {
      this.loadDatabase();
      this.initialized = true;
      elizaLogger.info('Platform Registry Service initialized');
    } catch (error) {
      elizaLogger.error('Failed to initialize Platform Registry Service:', error);
      throw error;
    }
  }

  private loadDatabase(): void {
    if (existsSync(this.databasePath)) {
      try {
        const data = readFileSync(this.databasePath, 'utf-8');
        const parsed = JSON.parse(data);

        // Convert date strings back to Date objects
        this.database = {
          ...parsed,
          items: parsed.items.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : undefined,
          })),
          buildJobs: parsed.buildJobs.map((job: any) => ({
            ...job,
            startedAt: new Date(job.startedAt),
            finishedAt: job.finishedAt ? new Date(job.finishedAt) : undefined,
          })),
          lastUpdated: new Date(parsed.lastUpdated),
        };

        elizaLogger.info(`Loaded ${this.database.items.length} registry items from database`);
      } catch (error) {
        elizaLogger.error('Failed to load registry database, using empty database:', error);
        this.database = {
          items: [],
          buildJobs: [],
          collections: [],
          analytics: {},
          stats: this.createEmptyStats(),
          version: '1.0.0',
          lastUpdated: new Date(),
        };
      }
    } else {
      elizaLogger.info('No existing registry database found, starting with empty database');
    }
  }

  private saveDatabase(): void {
    try {
      const dir = dirname(this.databasePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const dataToSave = {
        ...this.database,
        lastUpdated: new Date(),
      };

      writeFileSync(this.databasePath, JSON.stringify(dataToSave, null, 2));
      elizaLogger.debug('Registry database saved successfully');
    } catch (error) {
      elizaLogger.error('Failed to save registry database:', error);
      throw error;
    }
  }

  // Core registry operations
  async createItem(request: CreateRegistryItemRequest, authorId: string): Promise<RegistryItem> {
    this.validateCreateRequest(request);

    // Check for duplicate names
    const existing = this.database.items.find(
      (item) => item.name === request.name && item.type === request.type
    );
    if (existing) {
      throw new Error(`${request.type} with name '${request.name}' already exists`);
    }

    const now = new Date();
    const itemId = this.generateId(request.type, request.name);

    // Create base item
    const baseItem: Omit<
      RegistryItem,
      'type' | keyof (PluginRegistryItem | MCPRegistryItem | WorkflowRegistryItem)
    > = {
      id: itemId,
      name: request.name,
      displayName: request.displayName || request.name,
      description: request.description,
      version: request.version,
      author: await this.resolveAuthor(authorId),
      tags: request.tags,
      category: request.category,
      status: 'draft',
      visibility: request.visibility,
      license: request.license,
      metadata: request.metadata || {},
      stats: {
        downloads: 0,
        stars: 0,
        forks: 0,
        views: 0,
        averageRating: 0,
        reviewCount: 0,
      },
      repository: {
        type: 'local',
        url: '',
        ...request.repository,
      },
      installation: {
        method: 'npm',
        command: `npm install ${request.name}`,
        instructions: 'Standard npm installation',
      },
      compatibility: {
        elizaosVersions: ['1.0.0'],
        nodeVersions: ['18.x', '20.x'],
        platforms: ['linux', 'macos', 'windows'],
      },
      createdAt: now,
      updatedAt: now,
      readme: request.readme,
      isVerified: false,
      reportCount: 0,
    };

    // Create type-specific item
    let item: RegistryItem;

    if (request.type === 'plugin' && request.pluginData) {
      item = {
        ...baseItem,
        type: 'plugin',
        pluginData: request.pluginData,
      } as PluginRegistryItem;
    } else if (request.type === 'mcp' && request.mcpData) {
      item = {
        ...baseItem,
        type: 'mcp',
        mcpData: request.mcpData,
      } as MCPRegistryItem;
    } else if (request.type === 'workflow' && request.workflowData) {
      item = {
        ...baseItem,
        type: 'workflow',
        workflowData: request.workflowData,
      } as WorkflowRegistryItem;
    } else {
      throw new Error(`Invalid ${request.type} data provided`);
    }

    this.database.items.push(item);
    this.updateStats();
    this.saveDatabase();

    elizaLogger.info(`Created ${request.type} registry item: ${request.name}`);
    return item;
  }

  async getItem(id: string): Promise<RegistryItem | null> {
    const item = this.database.items.find((item) => item.id === id);

    if (item) {
      // Increment view count
      item.stats.views++;
      this.saveDatabase();
    }

    return item || null;
  }

  async updateItem(request: UpdateRegistryItemRequest, authorId: string): Promise<RegistryItem> {
    const item = await this.getItem(request.id);
    if (!item) {
      throw new Error(`Registry item with ID '${request.id}' not found`);
    }

    // Check authorization
    if (item.author.id !== authorId) {
      throw new Error('Unauthorized: You can only update your own items');
    }

    // Update fields
    const updatedItem = {
      ...item,
      ...(request.version && { version: request.version }),
      ...(request.description && { description: request.description }),
      ...(request.tags && { tags: request.tags }),
      ...(request.status && { status: request.status }),
      ...(request.visibility && { visibility: request.visibility }),
      ...(request.metadata && { metadata: { ...item.metadata, ...request.metadata } }),
      ...(request.readme && { readme: request.readme }),
      ...(request.changelog && { changelog: request.changelog }),
      updatedAt: new Date(),
    };

    // Update in database
    const index = this.database.items.findIndex((i) => i.id === request.id);
    this.database.items[index] = updatedItem;

    this.updateStats();
    this.saveDatabase();

    elizaLogger.info(`Updated registry item: ${item.name}`);
    return updatedItem;
  }

  async deleteItem(id: string, authorId: string): Promise<void> {
    const item = await this.getItem(id);
    if (!item) {
      throw new Error(`Registry item with ID '${id}' not found`);
    }

    // Check authorization
    if (item.author.id !== authorId) {
      throw new Error('Unauthorized: You can only delete your own items');
    }

    // Remove from database
    this.database.items = this.database.items.filter((i) => i.id !== id);

    this.updateStats();
    this.saveDatabase();

    elizaLogger.info(`Deleted registry item: ${item.name}`);
  }

  async searchItems(query: RegistryQuery = {}): Promise<RegistrySearchResult> {
    let items = [...this.database.items];

    // Apply filters
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          (item.displayName && item.displayName.toLowerCase().includes(searchLower))
      );
    }

    if (query.type) {
      items = items.filter((item) => item.type === query.type);
    }

    if (query.category) {
      items = items.filter((item) => item.category === query.category);
    }

    if (query.tags && query.tags.length > 0) {
      items = items.filter((item) => query.tags!.some((tag) => item.tags.includes(tag)));
    }

    if (query.author) {
      items = items.filter(
        (item) => item.author.username === query.author || item.author.id === query.author
      );
    }

    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.visibility) {
      items = items.filter((item) => item.visibility === query.visibility);
    }

    if (query.minRating) {
      items = items.filter((item) => item.stats.averageRating >= query.minRating!);
    }

    // Apply sorting
    if (query.sortBy) {
      items.sort((a, b) => {
        let aVal: any, bVal: any;

        switch (query.sortBy) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'created':
            aVal = a.createdAt.getTime();
            bVal = b.createdAt.getTime();
            break;
          case 'updated':
            aVal = a.updatedAt.getTime();
            bVal = b.updatedAt.getTime();
            break;
          case 'downloads':
            aVal = a.stats.downloads;
            bVal = b.stats.downloads;
            break;
          case 'stars':
            aVal = a.stats.stars;
            bVal = b.stats.stars;
            break;
          case 'rating':
            aVal = a.stats.averageRating;
            bVal = b.stats.averageRating;
            break;
          default:
            aVal = a.createdAt.getTime();
            bVal = b.createdAt.getTime();
        }

        if (query.sortOrder === 'desc') {
          return aVal > bVal ? -1 : 1;
        } else {
          return aVal > bVal ? 1 : -1;
        }
      });
    }

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);

    // Generate aggregations
    const aggregations = this.generateAggregations(this.database.items);

    return {
      items: paginatedItems,
      total: items.length,
      page,
      limit,
      hasMore: endIndex < items.length,
      aggregations,
    };
  }

  // Build workflow integration
  async requestBuild(request: RegistryBuildRequest): Promise<RegistryBuildStatus> {
    const item = await this.getItem(request.itemId);
    if (!item) {
      throw new Error(`Registry item with ID '${request.itemId}' not found`);
    }

    const jobId = this.generateId('build', `${item.name}-${Date.now()}`);
    const buildJob: RegistryBuildStatus = {
      jobId,
      itemId: request.itemId,
      status: 'queued',
      progress: 0,
      phase: 'Queued for building',
      logs: [],
      startedAt: new Date(),
    };

    this.database.buildJobs.push(buildJob);

    // Update item with build job reference
    const itemIndex = this.database.items.findIndex((i) => i.id === request.itemId);
    if (itemIndex !== -1) {
      this.database.items[itemIndex].buildJobId = jobId;
      this.database.items[itemIndex].buildStatus = 'pending';
    }

    this.saveDatabase();

    // TODO: Integrate with plugin-autocoder to start actual build
    elizaLogger.info(`Build requested for ${item.name}, job ID: ${jobId}`);

    return buildJob;
  }

  async getBuildStatus(jobId: string): Promise<RegistryBuildStatus | null> {
    return this.database.buildJobs.find((job) => job.jobId === jobId) || null;
  }

  async updateBuildStatus(jobId: string, update: Partial<RegistryBuildStatus>): Promise<void> {
    const jobIndex = this.database.buildJobs.findIndex((job) => job.jobId === jobId);
    if (jobIndex === -1) {
      throw new Error(`Build job with ID '${jobId}' not found`);
    }

    this.database.buildJobs[jobIndex] = {
      ...this.database.buildJobs[jobIndex],
      ...update,
    };

    // Update corresponding registry item
    if (update.status) {
      const itemIndex = this.database.items.findIndex((i) => i.buildJobId === jobId);
      if (itemIndex !== -1) {
        this.database.items[itemIndex].buildStatus =
          update.status === 'success'
            ? 'success'
            : update.status === 'failed'
              ? 'failed'
              : 'building';
      }
    }

    this.saveDatabase();
  }

  // Statistics and analytics
  async getStats(): Promise<PlatformStats> {
    this.updateStats();
    return this.database.stats;
  }

  async getItemsByAuthor(authorId: string): Promise<RegistryItem[]> {
    return this.database.items.filter((item) => item.author.id === authorId);
  }

  async incrementDownloads(itemId: string): Promise<void> {
    const item = await this.getItem(itemId);
    if (item) {
      item.stats.downloads++;
      item.stats.lastDownload = new Date();
      this.saveDatabase();
    }
  }

  async updateRating(itemId: string, newRating: number, reviewCount: number): Promise<void> {
    const item = await this.getItem(itemId);
    if (item) {
      item.stats.averageRating = newRating;
      item.stats.reviewCount = reviewCount;
      this.saveDatabase();
    }
  }

  // Utility methods
  private validateCreateRequest(request: CreateRegistryItemRequest): void {
    if (!request.name || request.name.length < 3) {
      throw new Error('Name must be at least 3 characters long');
    }

    if (!request.description || request.description.length < 10) {
      throw new Error('Description must be at least 10 characters long');
    }

    if (!request.version || !/^\d+\.\d+\.\d+/.test(request.version)) {
      throw new Error('Version must follow semantic versioning (e.g., 1.0.0)');
    }

    // Type-specific validation
    if (request.type === 'plugin' && !request.pluginData) {
      throw new Error('Plugin data is required for plugin items');
    }

    if (request.type === 'mcp' && !request.mcpData) {
      throw new Error('MCP data is required for MCP items');
    }

    if (request.type === 'workflow' && !request.workflowData) {
      throw new Error('Workflow data is required for workflow items');
    }
  }

  private async resolveAuthor(authorId: string): Promise<RegistryAuthor> {
    // In a real implementation, this would fetch from user service
    return {
      id: authorId,
      username: authorId,
      displayName: authorId,
    };
  }

  private generateId(type: string, identifier: string): string {
    const hash = createHash('md5');
    hash.update(`${type}-${identifier}-${Date.now()}`);
    return `${type}-${hash.digest('hex').substring(0, 8)}`;
  }

  private generateAggregations(items: RegistryItem[]) {
    const aggregations = {
      categories: {} as Record<string, number>,
      tags: {} as Record<string, number>,
      authors: {} as Record<string, number>,
      types: { plugin: 0, mcp: 0, workflow: 0 } as Record<RegistryItemType, number>,
    };

    items.forEach((item) => {
      // Categories
      aggregations.categories[item.category] = (aggregations.categories[item.category] || 0) + 1;

      // Types
      aggregations.types[item.type]++;

      // Tags
      item.tags.forEach((tag) => {
        aggregations.tags[tag] = (aggregations.tags[tag] || 0) + 1;
      });

      // Authors
      aggregations.authors[item.author.username] =
        (aggregations.authors[item.author.username] || 0) + 1;
    });

    return aggregations;
  }

  private updateStats(): void {
    const items = this.database.items;
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.database.stats = {
      totalItems: items.length,
      itemsByType: {
        plugin: items.filter((i) => i.type === 'plugin').length,
        mcp: items.filter((i) => i.type === 'mcp').length,
        workflow: items.filter((i) => i.type === 'workflow').length,
      },
      itemsByCategory: items.reduce(
        (acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      itemsByStatus: items.reduce(
        (acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      totalDownloads: items.reduce((sum, item) => sum + item.stats.downloads, 0),
      totalAuthors: new Set(items.map((item) => item.author.id)).size,
      activeAuthors: new Set(
        items.filter((item) => item.updatedAt >= monthAgo).map((item) => item.author.id)
      ).size,
      growth: {
        daily: items.filter((item) => item.createdAt >= dayAgo).length,
        weekly: items.filter((item) => item.createdAt >= weekAgo).length,
        monthly: items.filter((item) => item.createdAt >= monthAgo).length,
      },
      topItems: {
        mostDownloaded: items.sort((a, b) => b.stats.downloads - a.stats.downloads).slice(0, 5),
        highestRated: items
          .sort((a, b) => b.stats.averageRating - a.stats.averageRating)
          .slice(0, 5),
        trending: items.sort((a, b) => b.stats.views - a.stats.views).slice(0, 5),
        newest: items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5),
      },
      buildMetrics: {
        totalBuilds: this.database.buildJobs.length,
        successRate:
          this.database.buildJobs.length > 0
            ? this.database.buildJobs.filter((job) => job.status === 'success').length /
              this.database.buildJobs.length
            : 0,
        averageBuildTime: this.calculateAverageBuildTime(),
        activeBuilds: this.database.buildJobs.filter((job) =>
          ['queued', 'building', 'testing'].includes(job.status)
        ).length,
      },
    };
  }

  private createEmptyStats(): PlatformStats {
    return {
      totalItems: 0,
      itemsByType: { plugin: 0, mcp: 0, workflow: 0 },
      itemsByCategory: {},
      itemsByStatus: { draft: 0, pending: 0, approved: 0, deprecated: 0, archived: 0 },
      totalDownloads: 0,
      totalAuthors: 0,
      activeAuthors: 0,
      growth: { daily: 0, weekly: 0, monthly: 0 },
      topItems: { mostDownloaded: [], highestRated: [], trending: [], newest: [] },
      buildMetrics: { totalBuilds: 0, successRate: 0, averageBuildTime: 0, activeBuilds: 0 },
    };
  }

  private calculateAverageBuildTime(): number {
    const completedJobs = this.database.buildJobs.filter(
      (job) => job.status === 'success' || job.status === 'failed'
    );

    if (completedJobs.length === 0) {
      return 0;
    }

    const totalTime = completedJobs.reduce((sum, job) => {
      if (job.finishedAt) {
        return sum + (job.finishedAt.getTime() - job.startedAt.getTime());
      }
      return sum;
    }, 0);

    return totalTime / completedJobs.length;
  }

  // Database management
  async clearDatabase(): Promise<void> {
    this.database = {
      items: [],
      buildJobs: [],
      collections: [],
      analytics: {},
      stats: this.createEmptyStats(),
      version: '1.0.0',
      lastUpdated: new Date(),
    };
    this.saveDatabase();
  }

  async exportDatabase(): Promise<PlatformDatabase> {
    return JSON.parse(JSON.stringify(this.database));
  }

  async importDatabase(data: PlatformDatabase): Promise<void> {
    this.database = data;
    this.updateStats();
    this.saveDatabase();
  }
}
