/**
 * Enhanced Registry Types for ElizaOS Platform
 * Supports plugins, MCPs, and workflows with platform features
 */

export type RegistryItemType = 'plugin' | 'mcp' | 'workflow';

export type RegistryStatus = 'draft' | 'pending' | 'approved' | 'deprecated' | 'archived';

export type VisibilityLevel = 'public' | 'private' | 'unlisted';

export interface RegistryAuthor {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  githubUsername?: string;
  website?: string;
}

export interface RegistryStats {
  downloads: number;
  stars: number;
  forks: number;
  views: number;
  averageRating: number;
  reviewCount: number;
  lastDownload?: Date;
}

export interface RegistryRepository {
  type: 'github' | 'npm' | 'local' | 'custom';
  url: string;
  branch?: string;
  directory?: string;
  commit?: string;
}

export interface RegistryCompatibility {
  elizaosVersions: string[];
  nodeVersions: string[];
  platforms: string[];
  dependencies?: string[];
}

export interface RegistryInstallation {
  method: 'npm' | 'git' | 'download';
  command: string;
  instructions: string;
  requirements?: string[];
}

// Base registry item interface
export interface BaseRegistryItem {
  id: string;
  type: RegistryItemType;
  name: string;
  displayName?: string;
  description: string;
  version: string;
  author: RegistryAuthor;
  tags: string[];
  category: string;
  status: RegistryStatus;
  visibility: VisibilityLevel;
  license: string;

  // Metadata
  metadata: Record<string, any>;

  // Platform features
  stats: RegistryStats;
  repository: RegistryRepository;
  installation: RegistryInstallation;
  compatibility: RegistryCompatibility;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;

  // Content
  readme?: string;
  changelog?: string;
  screenshots?: string[];
  videoUrl?: string;

  // Platform workflow
  buildJobId?: string;
  buildStatus?: 'pending' | 'building' | 'success' | 'failed';
  buildLogs?: string;

  // Moderation
  isVerified: boolean;
  moderationNotes?: string;
  reportCount: number;
}

// Plugin-specific data
export interface PluginRegistryData {
  entryPoint: string;
  dependencies: string[];
  peerDependencies?: string[];
  engines: {
    node: string;
    elizaos: string;
  };
  capabilities: {
    actions: string[];
    providers: string[];
    services: string[];
    evaluators: string[];
  };
  configuration?: {
    required: boolean;
    schema?: Record<string, any>;
  };
  testing: {
    hasTests: boolean;
    coverage?: number;
    framework?: string;
  };
}

export interface PluginRegistryItem extends BaseRegistryItem {
  type: 'plugin';
  pluginData: PluginRegistryData;
}

// MCP-specific data
export interface MCPRegistryData {
  protocol: 'stdio' | 'http' | 'sse';
  connection: {
    command?: string;
    args?: string[];
    url?: string;
    env?: Record<string, string>;
  };
  capabilities: {
    tools: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, any>;
    }>;
    resources: Array<{
      name: string;
      description: string;
      mimeType: string;
    }>;
    prompts: Array<{
      name: string;
      description: string;
      arguments?: Record<string, any>;
    }>;
  };
  authenticationRequired: boolean;
  performance: {
    averageResponseTime: number;
    rateLimits?: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
  };
}

export interface MCPRegistryItem extends BaseRegistryItem {
  type: 'mcp';
  mcpData: MCPRegistryData;
}

// Workflow-specific data
export interface WorkflowRegistryData {
  platform: 'n8n' | 'zapier' | 'custom';
  workflowFormat: 'json' | 'yaml' | 'custom';
  triggers: Array<{
    type: string;
    name: string;
    description: string;
  }>;
  actions: Array<{
    type: string;
    name: string;
    description: string;
  }>;
  integrations: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime: number; // minutes
  requiresCredentials: string[];
}

export interface WorkflowRegistryItem extends BaseRegistryItem {
  type: 'workflow';
  workflowData: WorkflowRegistryData;
}

// Union type for all registry items
export type RegistryItem = PluginRegistryItem | MCPRegistryItem | WorkflowRegistryItem;

// Search and filtering
export interface RegistryQuery {
  search?: string;
  type?: RegistryItemType;
  category?: string;
  tags?: string[];
  author?: string;
  status?: RegistryStatus;
  visibility?: VisibilityLevel;
  minRating?: number;
  sortBy?: 'name' | 'created' | 'updated' | 'downloads' | 'stars' | 'rating';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  page?: number;
}

export interface RegistrySearchResult {
  items: RegistryItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  aggregations: {
    categories: Record<string, number>;
    tags: Record<string, number>;
    authors: Record<string, number>;
    types: Record<RegistryItemType, number>;
  };
}

// Creation and updates
export interface CreateRegistryItemRequest {
  type: RegistryItemType;
  name: string;
  displayName?: string;
  description: string;
  version: string;
  tags: string[];
  category: string;
  visibility: VisibilityLevel;
  license: string;
  metadata?: Record<string, any>;

  // Type-specific data
  pluginData?: PluginRegistryData;
  mcpData?: MCPRegistryData;
  workflowData?: WorkflowRegistryData;

  // Optional content
  readme?: string;
  repository?: Partial<RegistryRepository>;
}

export interface UpdateRegistryItemRequest {
  id: string;
  version?: string;
  description?: string;
  tags?: string[];
  status?: RegistryStatus;
  visibility?: VisibilityLevel;
  metadata?: Record<string, any>;
  readme?: string;
  changelog?: string;
}

// Platform integration
export interface RegistryBuildRequest {
  itemId: string;
  authorId: string;
  buildType: 'test' | 'publish';
  sandboxConfig?: {
    timeout: number;
    resources: {
      cpu: string;
      memory: string;
      disk: string;
    };
  };
}

export interface RegistryBuildStatus {
  jobId: string;
  itemId: string;
  status: 'queued' | 'building' | 'testing' | 'success' | 'failed' | 'cancelled';
  progress: number; // 0-100
  phase: string;
  logs: string[];
  artifacts?: string[];
  startedAt: Date;
  finishedAt?: Date;
  error?: string;
}

// User interaction
export interface RegistryReview {
  id: string;
  itemId: string;
  authorId: string;
  rating: number; // 1-5
  title: string;
  content: string;
  helpful: number;
  verified: boolean;
  createdAt: Date;
}

export interface RegistryReport {
  id: string;
  itemId: string;
  reporterId: string;
  reason: 'spam' | 'inappropriate' | 'malicious' | 'copyright' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
}

// Analytics and insights
export interface RegistryAnalytics {
  itemId: string;
  timeframe: 'day' | 'week' | 'month' | 'year';
  metrics: {
    downloads: number;
    views: number;
    installs: number;
    uninstalls: number;
    stars: number;
    forks: number;
    issues: number;
  };
  demographics: {
    topCountries: Array<{ country: string; count: number }>;
    userTypes: Record<string, number>;
  };
  performance: {
    averageInstallTime: number;
    successRate: number;
    errorRate: number;
  };
}

// Collections and curation
export interface RegistryCollection {
  id: string;
  name: string;
  description: string;
  curatorId: string;
  items: string[]; // Registry item IDs
  isPublic: boolean;
  featured: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Platform statistics
export interface PlatformStats {
  totalItems: number;
  itemsByType: Record<RegistryItemType, number>;
  itemsByCategory: Record<string, number>;
  itemsByStatus: Record<RegistryStatus, number>;
  totalDownloads: number;
  totalAuthors: number;
  activeAuthors: number;
  growth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  topItems: {
    mostDownloaded: RegistryItem[];
    highestRated: RegistryItem[];
    trending: RegistryItem[];
    newest: RegistryItem[];
  };
  buildMetrics: {
    totalBuilds: number;
    successRate: number;
    averageBuildTime: number;
    activeBuilds: number;
  };
}
