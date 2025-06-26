import * as fs from 'node:fs';
import * as path from 'node:path';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { randomBytes } from 'crypto';
import { logger } from '@elizaos/core';

/**
 * Base directory for all ElizaOS temporary files
 * Defaults to ~/.eliza-temp or can be overridden with ELIZA_TEMP_DIR
 */
export const ELIZA_TEMP_BASE = process.env.ELIZA_TEMP_DIR || join(homedir(), '.eliza-temp');

/**
 * Subdirectories for different types of temporary files
 */
export const TEMP_DIRS = {
  databases: 'databases',
  logs: 'logs',
  uploads: 'uploads',
  generated: 'generated',
  clones: 'clones',
  test: 'test',
  cache: 'cache',
  build: 'build',
} as const;

/**
 * Ensures the base temp directory and all subdirectories exist
 */
export function ensureTempDirs(): void {
  // Create base directory
  if (!existsSync(ELIZA_TEMP_BASE)) {
    mkdirSync(ELIZA_TEMP_BASE, { recursive: true });
  }

  // Create subdirectories
  for (const subdir of Object.values(TEMP_DIRS)) {
    const path = join(ELIZA_TEMP_BASE, subdir);
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }
}

/**
 * Get the path for a specific type of temp file
 * @param type - The type of temp file (databases, logs, etc.)
 * @param filename - Optional filename or subdirectory
 * @returns Full path to the temp file/directory
 */
export function getTempPath(type: keyof typeof TEMP_DIRS, filename?: string): string {
  ensureTempDirs();
  const basePath = join(ELIZA_TEMP_BASE, TEMP_DIRS[type]);
  return filename ? join(basePath, filename) : basePath;
}

/**
 * Create a unique temporary directory
 * @param type - The type of temp directory
 * @param prefix - Optional prefix for the directory name
 * @returns Path to the created directory
 */
export function createTempDir(type: keyof typeof TEMP_DIRS, prefix?: string): string {
  const uniqueId = randomBytes(8).toString('hex');
  const dirname = prefix ? `${prefix}-${uniqueId}` : uniqueId;
  const dirPath = getTempPath(type, dirname);

  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }

  return dirPath;
}

/**
 * Clean up a specific temp directory
 * @param path - Path to clean up
 * @param force - Force removal even if path is outside temp directory
 */
export function cleanupTempPath(path: string, force = false): void {
  const resolvedPath = resolve(path);
  const tempBase = resolve(ELIZA_TEMP_BASE);

  // Safety check: only delete paths within temp directory unless forced
  if (!force && !resolvedPath.startsWith(tempBase)) {
    throw new Error(`Refusing to delete path outside temp directory: ${path}`);
  }

  if (existsSync(resolvedPath)) {
    rmSync(resolvedPath, { recursive: true, force: true });
  }
}

/**
 * Clean up all temp files of a specific type
 * @param type - The type of temp files to clean
 */
export function cleanupTempType(type: keyof typeof TEMP_DIRS): void {
  const dirPath = getTempPath(type);
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Clean up all temp files
 */
export function cleanupAllTemp(): void {
  if (existsSync(ELIZA_TEMP_BASE)) {
    rmSync(ELIZA_TEMP_BASE, { recursive: true, force: true });
  }
  ensureTempDirs();
}

/**
 * Get a temp database path
 * @param name - Database name
 * @returns Path to database directory
 */
export function getTempDbPath(name?: string): string {
  if (!name) {
    name = `db-${Date.now()}-${randomBytes(4).toString('hex')}`;
  }
  return getTempPath('databases', name);
}

/**
 * Get a temp log file path
 * @param name - Log file name
 * @returns Path to log file
 */
export function getTempLogPath(name?: string): string {
  if (!name) {
    name = `log-${Date.now()}.log`;
  }
  return getTempPath('logs', name);
}

/**
 * Check if a path is within the temp directory
 * @param path - Path to check
 * @returns True if path is within temp directory
 */
export function isInTempDir(path: string): boolean {
  const resolvedPath = resolve(path);
  const tempBase = resolve(ELIZA_TEMP_BASE);
  return resolvedPath.startsWith(tempBase);
}

// Initialize temp directories on module load
ensureTempDirs();

/**
 * Archive result interface
 */
export interface ArchiveResult {
  archivePath: string;
  timestamp: string;
  summary: RunSummary;
}

/**
 * Run summary interface
 */
export interface RunSummary {
  startTime: string;
  endTime: string;
  duration: number;
  totalMessages: number;
  errors: number;
  warnings: number;
  autonomyMetrics?: {
    oodaCycles: number;
    actionsExecuted: number;
    decisionsRate: number;
  };
}

/**
 * Log archiver for autonomous agent runs
 */
export class LogArchiver {
  private startTime: Date = new Date();

  /**
   * Archive all logs to the specified destination directory
   */
  async archiveLogs(destinationDir: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `eliza-logs-${timestamp}`;
    const archivePath = path.join(destinationDir, archiveName);

    try {
      // Ensure destination directory exists
      await fs.promises.mkdir(destinationDir, { recursive: true });
      await fs.promises.mkdir(archivePath, { recursive: true });

      // Generate run summary
      const summary = await this.generateRunSummary();

      // Archive different types of logs
      await this.archiveSystemLogs(archivePath);
      await this.archiveAutonomyLogs(archivePath);
      await this.archiveAgentLogs(archivePath);

      // Create index file with metadata
      await this.createArchiveIndex(archivePath, summary);

      // Create run summary
      await this.createRunSummaryFile(archivePath, summary);

      logger.info(`📁 Logs successfully archived to: ${archivePath}`);
      return archivePath;
    } catch (error) {
      logger.error('❌ Failed to archive logs:', error);
      throw error;
    }
  }

  /**
   * Archive system logs from the main application
   */
  private async archiveSystemLogs(archivePath: string): Promise<void> {
    const systemLogsDir = path.join(archivePath, 'system');
    await fs.promises.mkdir(systemLogsDir, { recursive: true });

    // Copy various log sources
    const logSources = [
      { source: 'logs', pattern: '*.log' },
      { source: '.logs', pattern: '*.log' },
      { source: 'logs/eliza', pattern: '*.log' },
    ];

    for (const { source, pattern } of logSources) {
      try {
        if (fs.existsSync(source)) {
          await this.copyLogs(source, systemLogsDir, pattern);
        }
      } catch {
        // Continue if specific log source doesn't exist
      }
    }
  }

  /**
   * Archive autonomy-specific logs
   */
  private async archiveAutonomyLogs(archivePath: string): Promise<void> {
    const autonomyLogsDir = path.join(archivePath, 'autonomy');
    await fs.promises.mkdir(autonomyLogsDir, { recursive: true });

    // Archive OODA loop logs
    const autonomyLogDir = process.env.AUTONOMOUS_LOG_DIR || getTempLogPath('autonomy');

    if (fs.existsSync(autonomyLogDir)) {
      await this.copyLogs(autonomyLogDir, autonomyLogsDir, '*');
    }

    // Archive any autonomy-specific metrics
    await this.createAutonomyMetricsFile(autonomyLogsDir);
  }

  /**
   * Archive agent-specific logs
   */
  private async archiveAgentLogs(archivePath: string): Promise<void> {
    const agentLogsDir = path.join(archivePath, 'agents');
    await fs.promises.mkdir(agentLogsDir, { recursive: true });

    // Archive agent conversation logs, memory dumps, etc.
    const agentDataDirs = ['.elizadb', 'agent-data', 'memory-dumps'];

    for (const dir of agentDataDirs) {
      if (fs.existsSync(dir)) {
        try {
          const targetDir = path.join(agentLogsDir, path.basename(dir));
          await this.copyDirectory(dir, targetDir);
        } catch (error) {
          logger.warn(`⚠️ Could not archive ${dir}:`, error);
        }
      }
    }
  }

  /**
   * Copy logs matching a pattern from source to destination
   */
  private async copyLogs(sourceDir: string, destDir: string, pattern: string): Promise<void> {
    if (!fs.existsSync(sourceDir)) {
      return;
    }

    const files = await fs.promises.readdir(sourceDir);

    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);

      try {
        const stat = await fs.promises.stat(sourcePath);

        if (stat.isFile()) {
          // Simple pattern matching (could be enhanced with glob)
          if (pattern === '*' || file.match(pattern.replace('*', '.*'))) {
            await fs.promises.copyFile(sourcePath, destPath);
          }
        } else if (stat.isDirectory() && pattern === '*') {
          await this.copyDirectory(sourcePath, destPath);
        }
      } catch {
        // Continue with other files
      }
    }
  }

  /**
   * Copy entire directory recursively
   */
  private async copyDirectory(sourceDir: string, destDir: string): Promise<void> {
    await fs.promises.mkdir(destDir, { recursive: true });

    const files = await fs.promises.readdir(sourceDir);

    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);

      const stat = await fs.promises.stat(sourcePath);

      if (stat.isFile()) {
        await fs.promises.copyFile(sourcePath, destPath);
      } else if (stat.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      }
    }
  }

  /**
   * Create archive index file with metadata
   */
  private async createArchiveIndex(archivePath: string, summary: RunSummary): Promise<void> {
    const indexContent = {
      archiveInfo: {
        created: new Date().toISOString(),
        version: '1.0',
        type: 'eliza-autonomous-run',
      },
      runSummary: summary,
      contents: {
        system: 'System logs and application output',
        autonomy: 'OODA loop logs and autonomous operation data',
        agents: 'Agent conversation logs and memory data',
      },
    };

    const indexPath = path.join(archivePath, 'index.json');
    await fs.promises.writeFile(indexPath, JSON.stringify(indexContent, null, 2));
  }

  /**
   * Create human-readable run summary file
   */
  private async createRunSummaryFile(archivePath: string, summary: RunSummary): Promise<void> {
    const summaryContent = `
=== ElizaOS Autonomous Run Summary ===

Start Time: ${summary.startTime}
End Time: ${summary.endTime}
Duration: ${Math.round(summary.duration / 1000)} seconds

Metrics:
- Total Messages: ${summary.totalMessages}
- Errors: ${summary.errors}
- Warnings: ${summary.warnings}

${
  summary.autonomyMetrics
    ? `
Autonomy Metrics:
- OODA Cycles: ${summary.autonomyMetrics.oodaCycles}
- Actions Executed: ${summary.autonomyMetrics.actionsExecuted}
- Decision Rate: ${summary.autonomyMetrics.decisionsRate.toFixed(2)} decisions/min
`
    : ''
}

Archive Contents:
- system/: System logs and application output
- autonomy/: OODA loop logs and metrics
- agents/: Agent data and conversation logs

Generated: ${new Date().toISOString()}
    `;

    const summaryPath = path.join(archivePath, 'SUMMARY.txt');
    await fs.promises.writeFile(summaryPath, summaryContent);
  }

  /**
   * Create autonomy metrics file
   */
  private async createAutonomyMetricsFile(autonomyLogsDir: string): Promise<void> {
    const metricsContent = {
      timestamp: new Date().toISOString(),
      environment: {
        AUTONOMOUS_LOOP_INTERVAL: process.env.AUTONOMOUS_LOOP_INTERVAL,
        AUTONOMOUS_FILE_LOGGING: process.env.AUTONOMOUS_FILE_LOGGING,
        AUTONOMOUS_LOG_DIR: process.env.AUTONOMOUS_LOG_DIR,
        AUTONOMOUS_API_PORT: process.env.AUTONOMOUS_API_PORT,
      },
      // Additional metrics would be collected from the autonomy plugin
    };

    const metricsPath = path.join(autonomyLogsDir, 'metrics.json');
    await fs.promises.writeFile(metricsPath, JSON.stringify(metricsContent, null, 2));
  }

  /**
   * Generate comprehensive run summary
   */
  private async generateRunSummary(): Promise<RunSummary> {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    // These would be collected from actual logging systems
    const summary: RunSummary = {
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      totalMessages: 0, // Would be calculated from logs
      errors: 0, // Would be calculated from logs
      warnings: 0, // Would be calculated from logs
    };

    // Add autonomy-specific metrics if available
    if (process.env.AUTONOMOUS_FILE_LOGGING === 'true') {
      summary.autonomyMetrics = {
        oodaCycles: 0, // Would be collected from OODA service
        actionsExecuted: 0, // Would be collected from action logs
        decisionsRate: 0, // Calculated from cycle data
      };
    }

    return summary;
  }

  /**
   * Set the start time for the current run
   */
  setStartTime(startTime: Date): void {
    this.startTime = startTime;
  }
}
