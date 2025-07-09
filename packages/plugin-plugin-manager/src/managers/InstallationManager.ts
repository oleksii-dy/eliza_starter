import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import type { PluginState, InstallProgress } from '../types.ts';
import { PluginStatusValues } from '../types.ts';
import crypto from 'crypto';

// Safe command execution
async function safeExecute(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false, // Prevent shell injection
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set timeout
    const timeout = options.timeout || 300000; // 5 minutes default
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (_error) => {
      clearTimeout(timer);
      reject(_error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`Command timed out after ${timeout}ms`));
      } else if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const _error = new Error(`Command failed with code ${code}: ${stderr}`);
        (_error as any).code = code;
        (_error as any).stdout = stdout;
        (_error as any).stderr = stderr;
        reject(_error);
      }
    });
  });
}

export class InstallationManager {
  private runtime: IAgentRuntime;
  private installationCache = new Map<string, PluginState>();
  private activeInstallations = new Map<string, Promise<PluginState>>();
  private installRoot: string = '';
  private tempRoot: string = '';

  // Security constraints
  private readonly MAX_PACKAGE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly MAX_FILE_COUNT = 10000;
  private readonly ALLOWED_FILE_EXTENSIONS = new Set([
    '.js',
    '.ts',
    '.json',
    '.md',
    '.txt',
    '.yml',
    '.yaml',
    '.css',
    '.html',
    '.jsx',
    '.tsx',
    '.mjs',
    '.cjs',
  ]);

  // Input validation patterns
  private readonly VALID_PLUGIN_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  private readonly VALID_VERSION =
    /^\d+\.\d+\.\d+(-[a-z0-9-]+(\.[a-z0-9-]+)*)?(\+[a-z0-9-]+(\.[a-z0-9-]+)*)?$/i;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    // Set up secure installation directories
    const baseDir = path.resolve(process.cwd(), '.plugin-manager');
    this.installRoot = path.join(baseDir, 'installed');
    this.tempRoot = path.join(baseDir, 'temp');

    // Ensure directories exist with proper permissions
    await this.ensureSecureDirectory(this.installRoot);
    await this.ensureSecureDirectory(this.tempRoot);

    // Only log in non-test environments
    const nodeEnv = this.runtime.getSetting('NODE_ENV');
    const vitest = this.runtime.getSetting('VITEST');
    if (nodeEnv !== 'test' && !vitest) {
      elizaLogger.info('[InstallationManager] Initialized with secure directories', {
        installRoot: this.installRoot,
        tempRoot: this.tempRoot,
      });
    }
  }

  async cleanup(): Promise<void> {
    // Clear caches
    this.installationCache.clear();
    this.activeInstallations.clear();

    // Clean up temp directory
    try {
      await fs.rm(this.tempRoot, { recursive: true, force: true });
    } catch (_error) {
      elizaLogger.warn('[InstallationManager] Failed to clean temp directory', _error);
    }

    // Only log in non-test environments
    const nodeEnv = this.runtime.getSetting('NODE_ENV');
    const vitest = this.runtime.getSetting('VITEST');
    if (nodeEnv !== 'test' && !vitest) {
      elizaLogger.info('[InstallationManager] Cleaned up');
    }
  }

  async installFromRegistry(
    pluginName: string,
    version?: string,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<PluginState> {
    // Input validation FIRST
    if (!this.validatePluginName(pluginName)) {
      throw new Error(
        `Invalid plugin name: ${pluginName}. Plugin names must be lowercase alphanumeric with hyphens.`
      );
    }

    if (version && !this.validateVersion(version)) {
      throw new Error(`Invalid version: ${version}. Must be valid semver format.`);
    }

    // Check if already installing
    const installKey = `${pluginName}@${version || 'latest'}`;
    const activeInstallation = this.activeInstallations.get(installKey);
    if (activeInstallation) {
      elizaLogger.info(`[InstallationManager] Installation already in progress for ${installKey}`);
      return activeInstallation;
    }

    // Create installation promise with proper cleanup
    const installPromise = this.performInstallation(pluginName, version, onProgress).finally(() => {
      this.activeInstallations.delete(installKey);
    });

    this.activeInstallations.set(installKey, installPromise);

    return installPromise;
  }

  private async performInstallation(
    pluginName: string,
    version?: string,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<PluginState> {
    onProgress?.({
      phase: 'downloading',
      progress: 0,
      message: `Starting installation of ${pluginName}`,
    });

    // Create secure temporary directory
    const tempId = crypto.randomBytes(16).toString('hex');
    const tempDir = path.join(this.tempRoot, `install-${tempId}`);
    await this.ensureSecureDirectory(tempDir);

    try {
      // Download package with security checks
      onProgress?.({
        phase: 'downloading',
        progress: 25,
        message: `Downloading ${pluginName}`,
      });

      const packageSpec = version ? `${pluginName}@${version}` : pluginName;

      // Use npm pack to download without executing
      await safeExecute('npm', ['pack', packageSpec, '--json'], {
        cwd: tempDir,
        timeout: 60000, // 1 minute timeout for download
      });

      // Extract package
      onProgress?.({
        phase: 'extracting',
        progress: 50,
        message: `Extracting ${pluginName}`,
      });

      const files = await fs.readdir(tempDir);
      const tarball = files.find((f) => f.endsWith('.tgz'));
      if (!tarball) {
        throw new Error('Failed to download package');
      }

      // Verify tarball size
      const tarballPath = path.join(tempDir, tarball);
      const stats = await fs.stat(tarballPath);
      if (stats.size > this.MAX_PACKAGE_SIZE) {
        throw new Error(`Package too large: ${stats.size} bytes (max: ${this.MAX_PACKAGE_SIZE})`);
      }

      // Extract safely
      await safeExecute('tar', ['-xzf', tarball, '--strip-components=1'], {
        cwd: tempDir,
      });

      // Remove tarball
      await fs.unlink(tarballPath);

      // Validate package
      onProgress?.({
        phase: 'validating',
        progress: 75,
        message: `Validating ${pluginName}`,
      });

      await this.validatePackageContents(tempDir);

      const packageJsonPath = path.join(tempDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      // Validate package.json
      this.validatePackageJson(packageJson);

      // Create plugin state
      const pluginState: PluginState = {
        id: `${packageJson.name}-${Date.now()}`,
        name: packageJson.name,
        version: packageJson.version,
        status: PluginStatusValues.READY,
        missingEnvVars: [],
        buildLog: [],
        packageJson,
        createdAt: Date.now(),
        dependencies: packageJson.dependencies || {},
      };

      // Move to secure installation directory
      const pluginDir = path.join(this.installRoot, pluginState.id);
      await this.ensureSecureDirectory(path.dirname(pluginDir));
      await fs.rename(tempDir, pluginDir);

      // Set restrictive permissions
      await this.setSecurePermissions(pluginDir);

      onProgress?.({
        phase: 'complete',
        progress: 100,
        message: `Successfully installed ${pluginName}`,
      });

      // Cache the result
      this.installationCache.set(pluginName, pluginState);

      return pluginState;
    } catch (_error) {
      // Cleanup on _error
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw _error;
    }
  }

  async installFromLocalBundle(
    bundlePath: string,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<PluginState> {
    // Only log in non-test environments
    const nodeEnv = this.runtime.getSetting('NODE_ENV');
    const vitest = this.runtime.getSetting('VITEST');
    if (nodeEnv !== 'test' && !vitest) {
      elizaLogger.info('[InstallationManager] Installing from local bundle', {
        bundlePath,
      });
    }

    // Validate bundle path FIRST
    const resolvedPath = path.resolve(bundlePath);
    if (!this.isPathSafe(resolvedPath)) {
      throw new Error(`Invalid bundle path: ${bundlePath}`);
    }

    // Check if file exists
    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error('Bundle path must be a directory');
      }
    } catch (_error) {
      throw new Error(`Bundle path not found: ${bundlePath}`);
    }

    onProgress?.({
      phase: 'validating',
      progress: 30,
      message: 'Validating bundle contents...',
    });

    // Validate package contents
    await this.validatePackageContents(resolvedPath);

    // Read package.json
    const packageJsonPath = path.join(resolvedPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    // Validate package.json
    this.validatePackageJson(packageJson);

    // Create plugin state
    const pluginState: PluginState = {
      id: `${packageJson.name}-local-${Date.now()}`,
      name: packageJson.name,
      version: packageJson.version,
      status: PluginStatusValues.READY,
      missingEnvVars: [],
      buildLog: [],
      packageJson,
      createdAt: Date.now(),
      dependencies: packageJson.dependencies || {},
    };

    // Copy to secure installation directory
    const pluginDir = path.join(this.installRoot, pluginState.id);
    await this.ensureSecureDirectory(path.dirname(pluginDir));
    await this.copyDirectory(resolvedPath, pluginDir);

    // Set restrictive permissions
    await this.setSecurePermissions(pluginDir);

    onProgress?.({
      phase: 'complete',
      progress: 100,
      message: 'Installation complete',
    });

    return pluginState;
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    // Validate plugin ID
    if (!this.isValidPluginId(pluginId)) {
      throw new Error(`Invalid plugin ID: ${pluginId}`);
    }

    const pluginDir = path.join(this.installRoot, pluginId);

    // Check if directory exists and is within install root
    if (!this.isPathWithinRoot(pluginDir, this.installRoot)) {
      throw new Error('Invalid plugin path');
    }

    try {
      await fs.access(pluginDir);
    } catch {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Remove directory
    await fs.rm(pluginDir, { recursive: true, force: true });

    // Clear from cache
    for (const [key, value] of this.installationCache.entries()) {
      if (value.id === pluginId) {
        this.installationCache.delete(key);
      }
    }

    // Only log in non-test environments
    const nodeEnv = this.runtime.getSetting('NODE_ENV');
    const vitest = this.runtime.getSetting('VITEST');
    if (nodeEnv !== 'test' && !vitest) {
      elizaLogger.info('[InstallationManager] Plugin uninstalled', {
        pluginId,
      });
    }
  }

  async validateInstallation(pluginState: PluginState): Promise<boolean> {
    const pluginDir = path.join(this.installRoot, pluginState.id);

    // Security check
    if (!this.isPathWithinRoot(pluginDir, this.installRoot)) {
      return false;
    }

    try {
      // Check if directory exists
      await fs.access(pluginDir);

      // Check if package.json exists
      const packageJsonPath = path.join(pluginDir, 'package.json');
      await fs.access(packageJsonPath);

      // Check if main file exists
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const mainFile = packageJson.main || 'index.js';
      await fs.access(path.join(pluginDir, mainFile));

      return true;
    } catch {
      return false;
    }
  }

  // Security helper methods
  private validatePluginName(name: string): boolean {
    // Basic format check
    if (!this.VALID_PLUGIN_NAME.test(name)) {
      return false;
    }

    // For scoped packages, separate the scope and package name
    let packageNameToCheck = name;
    if (name.startsWith('@') && name.includes('/')) {
      const parts = name.split('/');
      if (parts.length !== 2) {
        return false;
      }
      // Check scope part (without @)
      const scope = parts[0].substring(1);
      packageNameToCheck = parts[1];

      // Validate scope separately
      if (!this.validateNamePart(scope)) {
        return false;
      }
    }

    // Validate the package name part
    return this.validateNamePart(packageNameToCheck);
  }

  private validateNamePart(namePart: string): boolean {
    // Security checks - reject dangerous patterns
    const dangerousPatterns = [
      /[<>:"|?*\\]/, // Special chars (but allow / for scopes)
      // eslint-disable-next-line no-control-regex
      /[\x00-\x1f\x7f]/, // Control characters
      /[;`&$()]/, // Shell special characters
      /\.\./, // Double dots
      /^\./, // Hidden files
      /\s/, // Whitespace
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(namePart)) {
        return false;
      }
    }

    // Check for reserved names
    const reserved = [
      'node_modules',
      'package',
      'src',
      'dist',
      'build',
      'con',
      'aux',
      'prn',
      'nul',
    ];
    if (reserved.includes(namePart.toLowerCase())) {
      return false;
    }

    return true;
  }

  private validateVersion(version: string): boolean {
    return this.VALID_VERSION.test(version);
  }

  private isValidPluginId(id: string): boolean {
    return /^[a-zA-Z0-9@/._-]+$/.test(id) && !id.includes('..');
  }

  private isPathSafe(targetPath: string): boolean {
    // Normalize and resolve the path
    const normalized = path.normalize(targetPath);
    const resolved = path.resolve(normalized);

    // Check for path traversal
    if (
      normalized.includes('..') ||
      normalized !== resolved.substring(resolved.indexOf(normalized))
    ) {
      return false;
    }

    // Check against system paths
    const systemPaths = [
      '/etc',
      '/usr',
      '/bin',
      '/sbin',
      '/proc',
      '/sys',
      '/dev',
      '/root',
      'C:\\Windows',
      'C:\\Program Files',
      '/System',
      '/Library',
    ];

    const lowerPath = resolved.toLowerCase();
    for (const sysPath of systemPaths) {
      if (lowerPath.startsWith(sysPath.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  private isPathWithinRoot(targetPath: string, root: string): boolean {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedRoot = path.resolve(root);
    return resolvedTarget.startsWith(resolvedRoot);
  }

  private async ensureSecureDirectory(dir: string): Promise<void> {
    await fs.mkdir(dir, {
      recursive: true,
      mode: 0o750, // rwxr-x---
    });
  }

  private async setSecurePermissions(dir: string): Promise<void> {
    // Set directory permissions to be restrictive
    await fs.chmod(dir, 0o750);

    // Recursively set file permissions
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await this.setSecurePermissions(filePath);
      } else {
        // Make files readable but not writable or executable
        await fs.chmod(filePath, 0o640);
      }
    }
  }

  private async validatePackageContents(dir: string): Promise<void> {
    const files = await this.getAllFiles(dir);

    // Check file count
    if (files.length > this.MAX_FILE_COUNT) {
      throw new Error(
        `Package contains too many files: ${files.length} (max: ${this.MAX_FILE_COUNT})`
      );
    }

    // Validate each file
    for (const file of files) {
      const relativePath = path.relative(dir, file);

      // Check for suspicious paths
      if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
        throw new Error(`Suspicious file path: ${relativePath}`);
      }

      // Check file extension
      const ext = path.extname(file).toLowerCase();
      if (ext && !this.ALLOWED_FILE_EXTENSIONS.has(ext)) {
        throw new Error(`Disallowed file type: ${ext}`);
      }

      // Check file size
      const stats = await fs.stat(file);
      if (stats.size > 10 * 1024 * 1024) {
        // 10MB per file
        throw new Error(`File too large: ${relativePath} (${stats.size} bytes)`);
      }
    }
  }

  private async getAllFiles(dir: string, files: string[] = []): Promise<string[]> {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        // Skip node_modules and .git
        if (item.name !== 'node_modules' && item.name !== '.git') {
          await this.getAllFiles(fullPath, files);
        }
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private validatePackageJson(packageJson: any): void {
    // Required fields
    if (!packageJson.name || typeof packageJson.name !== 'string') {
      throw new Error('Invalid package.json: missing or invalid name');
    }

    if (!packageJson.version || typeof packageJson.version !== 'string') {
      throw new Error('Invalid package.json: missing or invalid version');
    }

    // Validate name
    if (!this.validatePluginName(packageJson.name)) {
      throw new Error(`Invalid package name: ${packageJson.name}`);
    }

    // Check for suspicious scripts
    const dangerousScripts = ['preinstall', 'postinstall', 'preuninstall', 'postuninstall'];
    if (packageJson.scripts) {
      for (const script of dangerousScripts) {
        if (packageJson.scripts[script]) {
          throw new Error(`Dangerous script detected: ${script}`);
        }
      }
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and .git
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          await this.copyDirectory(srcPath, destPath);
        }
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  // Public getter for installation cache
  getInstallationCache(): Map<string, PluginState> {
    return new Map(this.installationCache);
  }
}
