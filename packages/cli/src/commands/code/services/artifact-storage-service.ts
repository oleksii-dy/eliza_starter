import { elizaLogger } from '@elizaos/core';
import type { TelemetryService } from './telemetry-service.js';
import type { GitHubCoordinator } from './github-coordinator.js';
import fs from 'fs/promises';
import path from 'path';

export interface ArtifactStorageOptions {
  org: string;
  telemetryService: TelemetryService;
  githubCoordinator?: GitHubCoordinator;
  localStoragePath?: string;
}

export interface StoredArtifact {
  id: string;
  type: 'code' | 'documentation' | 'plan' | 'research' | 'test' | 'config' | 'benchmark' | 'scenario';
  path: string;
  content: string;
  metadata: {
    generatedBy: string;
    request?: string;
    timestamp: string;
    size: number;
    language?: string;
    tags?: string[];
    [key: string]: any;
  };
  storage: {
    local?: string;
    github?: string;
    uploaded: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInfo {
  name: string;
  type: string;
  description: string;
  artifacts: number;
  lastModified: string;
  repository?: string;
}

export interface StorageStatus {
  connected: boolean;
  totalArtifacts: number;
  localArtifacts: number;
  uploadedArtifacts: number;
  totalSize: number;
  lastUpload?: string;
}

export class ArtifactStorageService {
  private options: ArtifactStorageOptions;
  private telemetryService: TelemetryService;
  private githubCoordinator?: GitHubCoordinator;
  private artifacts: Map<string, StoredArtifact> = new Map();
  private currentProject: string | null = null;
  private localStoragePath: string;
  private isInitialized = false;

  constructor(options: ArtifactStorageOptions) {
    this.options = options;
    this.telemetryService = options.telemetryService;
    this.githubCoordinator = options.githubCoordinator;
    this.localStoragePath = options.localStoragePath || path.join(process.cwd(), '.elizaos-artifacts');
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing Artifact Storage Service...');

      // Create local storage directory
      await fs.mkdir(this.localStoragePath, { recursive: true });

      // Load existing artifacts
      await this.loadExistingArtifacts();

      // Verify GitHub connection if available
      let githubConnected = false;
      if (this.githubCoordinator) {
        githubConnected = await this.githubCoordinator.isConnected();
      }

      await this.telemetryService.logEvent('artifact_storage_initialized', {
        organization: this.options.org,
        localPath: this.localStoragePath,
        githubConnected,
        existingArtifacts: this.artifacts.size,
      }, 'code-interface');

      this.isInitialized = true;
      elizaLogger.info('✅ Artifact Storage Service initialized');
    } catch (error) {
      elizaLogger.error('Failed to initialize Artifact Storage Service:', error);
      throw error;
    }
  }

  async storeArtifact(artifact: Omit<StoredArtifact, 'id' | 'storage' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Artifact Storage Service not initialized');
    }

    const artifactId = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const storedArtifact: StoredArtifact = {
      ...artifact,
      id: artifactId,
      metadata: {
        ...artifact.metadata,
        size: artifact.content.length,
        language: this.detectLanguage(artifact.path),
      },
      storage: {
        uploaded: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    try {
      // Store locally first
      const localPath = await this.storeLocally(storedArtifact);
      storedArtifact.storage.local = localPath;

      // Store in memory
      this.artifacts.set(artifactId, storedArtifact);

      // Try to upload to GitHub
      if (this.githubCoordinator) {
        try {
          const githubUrl = await this.uploadToGitHub(storedArtifact);
          storedArtifact.storage.github = githubUrl;
          storedArtifact.storage.uploaded = true;
          storedArtifact.updatedAt = new Date().toISOString();
        } catch (uploadError) {
          elizaLogger.warn(`Failed to upload artifact ${artifactId} to GitHub:`, uploadError);
          // Continue without failing - local storage succeeded
        }
      }

      await this.telemetryService.logEvent('artifact_stored', {
        artifactId,
        type: artifact.type,
        size: artifact.content.length,
        uploaded: storedArtifact.storage.uploaded,
        hasMetadata: Object.keys(artifact.metadata).length > 0,
      }, 'code-interface');

      elizaLogger.info(`Stored artifact ${artifactId}: ${artifact.path}`);
      return artifactId;

    } catch (error) {
      await this.telemetryService.logError('artifact_storage_failed', error as Error, {
        artifactId,
        type: artifact.type,
        path: artifact.path,
      });
      throw error;
    }
  }

  private async storeLocally(artifact: StoredArtifact): Promise<string> {
    const projectDir = this.currentProject ? path.join(this.localStoragePath, this.currentProject) : this.localStoragePath;
    const typeDir = path.join(projectDir, artifact.type);
    await fs.mkdir(typeDir, { recursive: true });

    const fileName = `${artifact.id}-${path.basename(artifact.path)}`;
    const filePath = path.join(typeDir, fileName);

    await fs.writeFile(filePath, artifact.content, 'utf8');

    // Also store metadata
    const metadataPath = filePath + '.meta.json';
    await fs.writeFile(metadataPath, JSON.stringify({
      id: artifact.id,
      type: artifact.type,
      originalPath: artifact.path,
      metadata: artifact.metadata,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
    }, null, 2), 'utf8');

    return filePath;
  }

  private async uploadToGitHub(artifact: StoredArtifact): Promise<string> {
    if (!this.githubCoordinator) {
      throw new Error('GitHub coordinator not available');
    }

    const repositoryType = this.mapTypeToRepository(artifact.type);
    const fileName = `${artifact.id}-${path.basename(artifact.path)}`;
    const uploadPath = this.currentProject ? `${this.currentProject}/${fileName}` : fileName;

    const commitMessage = `Add ${artifact.type} artifact: ${artifact.path}

Generated by: ${artifact.metadata.generatedBy}
${artifact.metadata.request ? `Request: ${artifact.metadata.request}` : ''}
Size: ${artifact.metadata.size} bytes
Timestamp: ${artifact.metadata.timestamp}`;

    return await this.githubCoordinator.uploadArtifact(
      repositoryType,
      fileName,
      artifact.content,
      commitMessage,
      this.currentProject
    );
  }

  private mapTypeToRepository(type: StoredArtifact['type']): 'code' | 'documentation' | 'telemetry' | 'error-logs' | 'scenarios' | 'benchmarks' {
    const mapping: Record<StoredArtifact['type'], 'code' | 'documentation' | 'telemetry' | 'error-logs' | 'scenarios' | 'benchmarks'> = {
      code: 'code',
      test: 'code',
      config: 'code',
      documentation: 'documentation',
      plan: 'documentation',
      research: 'documentation',
      benchmark: 'benchmarks',
      scenario: 'scenarios',
    };

    return mapping[type] || 'code';
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.rs': 'rust',
      '.go': 'go',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.json': 'json',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.toml': 'toml',
      '.md': 'markdown',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sql': 'sql',
      '.sh': 'bash',
      '.ps1': 'powershell',
    };

    return languageMap[ext] || 'text';
  }

  async getArtifact(artifactId: string): Promise<StoredArtifact | null> {
    return this.artifacts.get(artifactId) || null;
  }

  async listArtifacts(filter?: {
    type?: StoredArtifact['type'];
    project?: string;
    language?: string;
    since?: Date;
    limit?: number;
  }): Promise<StoredArtifact[]> {
    let artifacts = Array.from(this.artifacts.values());

    if (filter?.type) {
      artifacts = artifacts.filter(a => a.type === filter.type);
    }

    if (filter?.language) {
      artifacts = artifacts.filter(a => a.metadata.language === filter.language);
    }

    if (filter?.since) {
      const sinceMs = filter.since.getTime();
      artifacts = artifacts.filter(a => new Date(a.createdAt).getTime() >= sinceMs);
    }

    // Sort by creation date (newest first)
    artifacts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter?.limit) {
      artifacts = artifacts.slice(0, filter.limit);
    }

    return artifacts;
  }

  async searchArtifacts(query: string, limit = 20): Promise<StoredArtifact[]> {
    const lowerQuery = query.toLowerCase();
    
    const matchingArtifacts = Array.from(this.artifacts.values()).filter(artifact => {
      return (
        artifact.path.toLowerCase().includes(lowerQuery) ||
        artifact.content.toLowerCase().includes(lowerQuery) ||
        artifact.metadata.generatedBy.toLowerCase().includes(lowerQuery) ||
        artifact.metadata.request?.toLowerCase().includes(lowerQuery) ||
        artifact.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });

    // Sort by relevance (simple scoring)
    matchingArtifacts.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, lowerQuery);
      const scoreB = this.calculateRelevanceScore(b, lowerQuery);
      return scoreB - scoreA;
    });

    return matchingArtifacts.slice(0, limit);
  }

  private calculateRelevanceScore(artifact: StoredArtifact, query: string): number {
    let score = 0;

    if (artifact.path.toLowerCase().includes(query)) score += 10;
    if (artifact.metadata.generatedBy.toLowerCase().includes(query)) score += 5;
    if (artifact.metadata.request?.toLowerCase().includes(query)) score += 7;
    if (artifact.metadata.tags?.some(tag => tag.toLowerCase().includes(query))) score += 3;

    // Count occurrences in content (capped to avoid overwhelming)
    const contentMatches = (artifact.content.toLowerCase().match(new RegExp(query, 'g')) || []).length;
    score += Math.min(contentMatches, 10);

    return score;
  }

  async createProject(name: string, type = 'general', description = ''): Promise<void> {
    const projectDir = path.join(this.localStoragePath, name);
    
    try {
      await fs.mkdir(projectDir, { recursive: true });

      // Create project metadata
      const projectMeta = {
        name,
        type,
        description,
        createdAt: new Date().toISOString(),
        artifacts: 0,
      };

      await fs.writeFile(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectMeta, null, 2),
        'utf8'
      );

      await this.telemetryService.logEvent('project_created', {
        name,
        type,
        description: description.substring(0, 100),
      }, 'code-interface');

      elizaLogger.info(`Created project: ${name}`);
    } catch (error) {
      await this.telemetryService.logError('project_creation_failed', error as Error, { name, type });
      throw error;
    }
  }

  async openProject(name: string): Promise<void> {
    const projectDir = path.join(this.localStoragePath, name);
    
    try {
      await fs.access(projectDir);
      this.currentProject = name;

      await this.telemetryService.logEvent('project_opened', { name }, 'code-interface');
      elizaLogger.info(`Opened project: ${name}`);
    } catch (error) {
      throw new Error(`Project ${name} not found`);
    }
  }

  async listProjects(): Promise<ProjectInfo[]> {
    try {
      const entries = await fs.readdir(this.localStoragePath, { withFileTypes: true });
      const projects: ProjectInfo[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const projectMetaPath = path.join(this.localStoragePath, entry.name, 'project.json');
            const projectMeta = JSON.parse(await fs.readFile(projectMetaPath, 'utf8'));
            
            // Count artifacts in this project
            const artifactCount = Array.from(this.artifacts.values())
              .filter(a => a.storage.local?.includes(entry.name)).length;

            projects.push({
              name: entry.name,
              type: projectMeta.type || 'general',
              description: projectMeta.description || '',
              artifacts: artifactCount,
              lastModified: projectMeta.updatedAt || projectMeta.createdAt,
              repository: projectMeta.repository,
            });
          } catch (error) {
            // Skip directories without valid project metadata
            elizaLogger.debug(`Skipping directory ${entry.name}: no valid project metadata`);
          }
        }
      }

      return projects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    } catch (error) {
      elizaLogger.warn('Failed to list projects:', error);
      return [];
    }
  }

  private async loadExistingArtifacts(): Promise<void> {
    try {
      const artifacts = await this.scanLocalArtifacts(this.localStoragePath);
      artifacts.forEach(artifact => {
        this.artifacts.set(artifact.id, artifact);
      });

      elizaLogger.info(`Loaded ${artifacts.length} existing artifacts`);
    } catch (error) {
      elizaLogger.warn('Failed to load existing artifacts:', error);
    }
  }

  private async scanLocalArtifacts(directory: string): Promise<StoredArtifact[]> {
    const artifacts: StoredArtifact[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subArtifacts = await this.scanLocalArtifacts(fullPath);
          artifacts.push(...subArtifacts);
        } else if (entry.name.endsWith('.meta.json')) {
          // Load artifact metadata
          try {
            const metadata = JSON.parse(await fs.readFile(fullPath, 'utf8'));
            const contentPath = fullPath.replace('.meta.json', '');
            
            // Check if content file exists
            try {
              const content = await fs.readFile(contentPath, 'utf8');
              
              artifacts.push({
                id: metadata.id,
                type: metadata.type,
                path: metadata.originalPath,
                content,
                metadata: metadata.metadata,
                storage: {
                  local: contentPath,
                  uploaded: false, // Will be updated if GitHub URL is found
                },
                createdAt: metadata.createdAt,
                updatedAt: metadata.updatedAt,
              });
            } catch {
              // Content file missing, skip this artifact
            }
          } catch (error) {
            elizaLogger.debug(`Failed to load artifact metadata from ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      elizaLogger.debug(`Failed to scan directory ${directory}:`, error);
    }

    return artifacts;
  }

  async getStatus(): Promise<StorageStatus> {
    const totalArtifacts = this.artifacts.size;
    const uploadedArtifacts = Array.from(this.artifacts.values()).filter(a => a.storage.uploaded).length;
    const totalSize = Array.from(this.artifacts.values()).reduce((sum, a) => sum + a.metadata.size, 0);
    
    const lastUploadedArtifact = Array.from(this.artifacts.values())
      .filter(a => a.storage.uploaded)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

    return {
      connected: this.githubCoordinator ? await this.githubCoordinator.isConnected() : false,
      totalArtifacts,
      localArtifacts: totalArtifacts,
      uploadedArtifacts,
      totalSize,
      lastUpload: lastUploadedArtifact?.updatedAt,
    };
  }

  async retryFailedUploads(): Promise<number> {
    const failedArtifacts = Array.from(this.artifacts.values()).filter(a => !a.storage.uploaded);
    let successCount = 0;

    if (!this.githubCoordinator) {
      throw new Error('GitHub coordinator not available for retry');
    }

    for (const artifact of failedArtifacts) {
      try {
        const githubUrl = await this.uploadToGitHub(artifact);
        artifact.storage.github = githubUrl;
        artifact.storage.uploaded = true;
        artifact.updatedAt = new Date().toISOString();
        successCount++;
      } catch (error) {
        elizaLogger.warn(`Retry failed for artifact ${artifact.id}:`, error);
      }
    }

    if (successCount > 0) {
      await this.telemetryService.logEvent('artifacts_retry_completed', {
        attempted: failedArtifacts.length,
        successful: successCount,
      }, 'code-interface');
    }

    return successCount;
  }

  async exportArtifacts(format: 'json' | 'zip' = 'json'): Promise<string> {
    const artifacts = Array.from(this.artifacts.values());
    
    if (format === 'json') {
      return JSON.stringify({
        exported: new Date().toISOString(),
        organization: this.options.org,
        totalArtifacts: artifacts.length,
        artifacts: artifacts.map(a => ({
          ...a,
          content: a.content.length > 1000 ? a.content.substring(0, 1000) + '...' : a.content,
        })),
      }, null, 2);
    } else {
      // ZIP format would require additional implementation
      throw new Error('ZIP export format not yet implemented');
    }
  }

  async stop(): Promise<void> {
    try {
      elizaLogger.info('Stopping Artifact Storage Service...');

      // Save any pending metadata
      // Final telemetry
      const status = await this.getStatus();
      await this.telemetryService.logEvent('artifact_storage_stopped', {
        status,
        currentProject: this.currentProject,
      }, 'code-interface');

      this.isInitialized = false;
      this.currentProject = null;

      elizaLogger.info('✅ Artifact Storage Service stopped');
    } catch (error) {
      elizaLogger.error('Error stopping Artifact Storage Service:', error);
    }
  }
}