import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PluginVersion {
  version: string;
  branch: string;
  commit: string;
  timestamp: number;
  author: string;
  message: string;
  snapshot: {
    dependencies: Record<string, string>;
    devDependencies?: Record<string, string>;
    packageJson: any;
  };
}

export interface PluginBranch {
  name: string;
  current: boolean;
  lastCommit: string;
  ahead: number;
  behind: number;
  description?: string;
}

export interface VersionHistory {
  pluginId: string;
  pluginName: string;
  currentBranch: string;
  branches: PluginBranch[];
  versions: PluginVersion[];
}

export class VersionManager {
  private runtime: IAgentRuntime;
  private versionHistories = new Map<string, VersionHistory>();
  private pluginPaths = new Map<string, string>();

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  /**
   * Initialize version tracking for a plugin
   */
  async initializePlugin(pluginId: string, pluginName: string, pluginPath: string): Promise<void> {
    this.pluginPaths.set(pluginId, pluginPath);

    // Initialize git repo if not already
    const isGitRepo = await fs.exists(path.join(pluginPath, '.git'));
    if (!isGitRepo) {
      await execAsync('git init', { cwd: pluginPath });
      await execAsync('git add .', { cwd: pluginPath });
      await execAsync('git commit -m "Initial commit"', { cwd: pluginPath });
    }

    // Get current branch
    const { stdout: currentBranch } = await execAsync('git branch --show-current', {
      cwd: pluginPath,
    });

    // Get all branches
    const branches = await this.getBranches(pluginPath);

    // Get version history
    const versions = await this.getVersionHistory(pluginPath);

    this.versionHistories.set(pluginId, {
      pluginId,
      pluginName,
      currentBranch: currentBranch.trim(),
      branches,
      versions,
    });
  }

  /**
   * Create a new branch for plugin modifications
   */
  async createBranch(
    pluginId: string,
    branchName: string,
    description?: string
  ): Promise<PluginBranch> {
    const pluginPath = this.pluginPaths.get(pluginId);
    if (!pluginPath) {
      throw new Error(`Plugin ${pluginId} not initialized`);
    }

    elizaLogger.info(`[VersionManager] Creating branch ${branchName} for plugin ${pluginId}`);

    // Create and checkout new branch
    await execAsync(`git checkout -b ${branchName}`, { cwd: pluginPath });

    // Add branch description as a commit message
    if (description) {
      await execAsync(`git commit --allow-empty -m "Branch: ${branchName}\n\n${description}"`, {
        cwd: pluginPath,
      });
    }

    // Update history
    const history = this.versionHistories.get(pluginId)!;
    const newBranch: PluginBranch = {
      name: branchName,
      current: true,
      lastCommit: await this.getLastCommit(pluginPath),
      ahead: 0,
      behind: 0,
      description,
    };

    history.branches.push(newBranch);
    history.currentBranch = branchName;

    // Update other branches' current status
    history.branches.forEach((b) => {
      if (b.name !== branchName) {
        b.current = false;
      }
    });

    return newBranch;
  }

  /**
   * Switch to a different branch
   */
  async switchBranch(pluginId: string, branchName: string): Promise<void> {
    const pluginPath = this.pluginPaths.get(pluginId);
    if (!pluginPath) {
      throw new Error(`Plugin ${pluginId} not initialized`);
    }

    elizaLogger.info(`[VersionManager] Switching to branch ${branchName} for plugin ${pluginId}`);

    // Check for uncommitted changes
    const { stdout: status } = await execAsync('git status --porcelain', { cwd: pluginPath });
    if (status.trim()) {
      throw new Error('Uncommitted changes detected. Please commit or stash changes first.');
    }

    // Switch branch
    await execAsync(`git checkout ${branchName}`, { cwd: pluginPath });

    // Update history
    const history = this.versionHistories.get(pluginId)!;
    history.currentBranch = branchName;
    history.branches.forEach((b) => {
      b.current = b.name === branchName;
    });
  }

  /**
   * Create a version snapshot with full dependency info
   */
  async createSnapshot(
    pluginId: string,
    message: string,
    bumpType: 'major' | 'minor' | 'patch' = 'patch'
  ): Promise<PluginVersion> {
    const pluginPath = this.pluginPaths.get(pluginId);
    if (!pluginPath) {
      throw new Error(`Plugin ${pluginId} not initialized`);
    }

    const history = this.versionHistories.get(pluginId)!;

    // Read package.json
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    // Bump version
    const currentVersion = packageJson.version || '1.0.0';
    const newVersion = semver.inc(currentVersion, bumpType)!;
    packageJson.version = newVersion;

    // Save updated package.json
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

    // Create snapshot
    const snapshot: PluginVersion = {
      version: newVersion,
      branch: history.currentBranch,
      commit: '', // Will be set after commit
      timestamp: Date.now(),
      author: await this.getGitUser(pluginPath),
      message,
      snapshot: {
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        packageJson: { ...packageJson },
      },
    };

    // Commit changes
    await execAsync('git add .', { cwd: pluginPath });
    await execAsync(`git commit -m "v${newVersion}: ${message}"`, { cwd: pluginPath });

    // Get commit hash
    snapshot.commit = await this.getLastCommit(pluginPath);

    // Tag the version
    await execAsync(`git tag v${newVersion}`, { cwd: pluginPath });

    // Add to history
    history.versions.push(snapshot);

    elizaLogger.info(`[VersionManager] Created version ${newVersion} for plugin ${pluginId}`);

    return snapshot;
  }

  /**
   * Get list of branches for a plugin
   */
  async getBranchList(pluginId: string): Promise<PluginBranch[]> {
    const pluginPath = this.pluginPaths.get(pluginId);
    if (!pluginPath) {
      throw new Error(`Plugin ${pluginId} not initialized`);
    }

    return this.getBranches(pluginPath);
  }

  /**
   * Get version history for a plugin
   */
  async getHistory(pluginId: string): Promise<VersionHistory> {
    const history = this.versionHistories.get(pluginId);
    if (!history) {
      throw new Error(`Plugin ${pluginId} not initialized`);
    }

    // Refresh branch info
    const pluginPath = this.pluginPaths.get(pluginId)!;
    history.branches = await this.getBranches(pluginPath);

    return history;
  }

  /**
   * Rollback to a previous version
   */
  async rollback(pluginId: string, version: string): Promise<void> {
    const pluginPath = this.pluginPaths.get(pluginId);
    if (!pluginPath) {
      throw new Error(`Plugin ${pluginId} not initialized`);
    }

    const history = this.versionHistories.get(pluginId)!;
    const targetVersion = history.versions.find((v) => v.version === version);

    if (!targetVersion) {
      throw new Error(`Version ${version} not found`);
    }

    elizaLogger.info(`[VersionManager] Rolling back plugin ${pluginId} to version ${version}`);

    // Create rollback branch
    const rollbackBranch = `rollback-to-${version}-${Date.now()}`;
    await this.createBranch(pluginId, rollbackBranch, `Rollback to version ${version}`);

    // Checkout the specific commit
    await execAsync(`git checkout ${targetVersion.commit} -- .`, { cwd: pluginPath });

    // Restore package.json from snapshot
    const packageJsonPath = path.join(pluginPath, 'package.json');
    await fs.writeJson(packageJsonPath, targetVersion.snapshot.packageJson, { spaces: 2 });

    // Commit the rollback
    await execAsync('git add .', { cwd: pluginPath });
    await execAsync(`git commit -m "Rollback to v${version}"`, { cwd: pluginPath });

    elizaLogger.info(`[VersionManager] Successfully rolled back to version ${version}`);
  }

  /**
   * Merge branches
   */
  async mergeBranch(
    pluginId: string,
    sourceBranch: string,
    targetBranch: string = 'main'
  ): Promise<void> {
    const pluginPath = this.pluginPaths.get(pluginId);
    if (!pluginPath) {
      throw new Error(`Plugin ${pluginId} not initialized`);
    }

    elizaLogger.info(`[VersionManager] Merging ${sourceBranch} into ${targetBranch}`);

    // Switch to target branch
    await this.switchBranch(pluginId, targetBranch);

    // Merge source branch
    try {
      await execAsync(`git merge ${sourceBranch} --no-ff -m "Merge branch '${sourceBranch}'"`, {
        cwd: pluginPath,
      });
      elizaLogger.info(`[VersionManager] Successfully merged ${sourceBranch} into ${targetBranch}`);
    } catch (_error) {
      elizaLogger.error('[VersionManager] Merge conflict detected', _error);
      throw new Error('Merge conflict detected. Please resolve manually.');
    }
  }

  /**
   * Get diff between branches or versions
   */
  async getDiff(pluginId: string, from: string, to: string = 'HEAD'): Promise<string> {
    const pluginPath = this.pluginPaths.get(pluginId);
    if (!pluginPath) {
      throw new Error(`Plugin ${pluginId} not initialized`);
    }

    const { stdout } = await execAsync(`git diff ${from}..${to}`, { cwd: pluginPath });
    return stdout;
  }

  // Private helper methods

  private async getBranches(pluginPath: string): Promise<PluginBranch[]> {
    const { stdout: branchList } = await execAsync('git branch -a', { cwd: pluginPath });
    const { stdout: currentBranch } = await execAsync('git branch --show-current', {
      cwd: pluginPath,
    });

    const branches: PluginBranch[] = [];
    const lines = branchList.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const isCurrent = line.startsWith('*');
      const branchName = line.replace(/^\*?\s+/, '').trim();

      if (branchName.includes('->') || branchName.startsWith('remotes/')) {
        continue; // Skip remote tracking branches
      }

      try {
        const { stdout: lastCommit } = await execAsync(`git rev-parse ${branchName}`, {
          cwd: pluginPath,
        });

        branches.push({
          name: branchName,
          current: isCurrent || branchName === currentBranch.trim(),
          lastCommit: lastCommit.trim().substring(0, 7),
          ahead: 0,
          behind: 0,
        });
      } catch {
        // Branch might not exist locally
      }
    }

    return branches;
  }

  private async getVersionHistory(pluginPath: string): Promise<PluginVersion[]> {
    const versions: PluginVersion[] = [];

    try {
      // Get all tags
      const { stdout: tags } = await execAsync('git tag -l "v*"', { cwd: pluginPath });
      const tagList = tags.split('\n').filter((tag) => tag.trim());

      for (const tag of tagList) {
        try {
          // Get tag info
          const { stdout: tagInfo } = await execAsync(
            `git show ${tag} --format="%H|%an|%at|%s" --no-patch`,
            { cwd: pluginPath }
          );

          const [commit, author, timestamp, message] = tagInfo.trim().split('|');

          // Try to get package.json at that tag
          const { stdout: packageJsonContent } = await execAsync(`git show ${tag}:package.json`, {
            cwd: pluginPath,
          });

          const packageJson = JSON.parse(packageJsonContent);

          versions.push({
            version: tag.replace('v', ''),
            branch: 'main', // Tags are usually on main
            commit: commit.substring(0, 7),
            timestamp: parseInt(timestamp, 10) * 1000,
            author,
            message,
            snapshot: {
              dependencies: packageJson.dependencies || {},
              devDependencies: packageJson.devDependencies || {},
              packageJson,
            },
          });
        } catch (_error) {
          elizaLogger.warn(`[VersionManager] Failed to get info for tag ${tag}`, _error);
        }
      }
    } catch (_error) {
      elizaLogger.warn('[VersionManager] Failed to get version history', _error);
    }

    return versions.sort((a, b) => b.timestamp - a.timestamp);
  }

  private async getLastCommit(pluginPath: string): Promise<string> {
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: pluginPath });
    return stdout.trim().substring(0, 7);
  }

  private async getGitUser(pluginPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git config user.name', { cwd: pluginPath });
      return stdout.trim();
    } catch {
      return 'Unknown';
    }
  }
}
