#!/usr/bin/env bun

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths relative to this script
const AGENT_FILES_DIR = path.join(__dirname, '..', 'agent-files');
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const PACKAGES_DIR = path.join(PROJECT_ROOT, 'packages');

// Files to copy
const AGENTS_MD_SOURCE = path.join(AGENT_FILES_DIR, 'AGENTS.md');
const CURSOR_RULES_SOURCE_DIR = path.join(AGENT_FILES_DIR, 'cursor', 'rules');

// Gitignore entries to check/add
const GITIGNORE_ENTRIES = ['AGENTS.md', '.cursor/rules/elizaos', 'CLAUDE.md', '.cursorignore'];

interface CopyResult {
  success: boolean;
  source: string;
  destination: string;
  error?: string;
}

/**
 * Ensures a directory exists, creating it if necessary
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✓ Created directory: ${dirPath}`);
  }
}

/**
 * Copies a file from source to destination
 */
function copyFile(
  source: string,
  destination: string,
  forceOverwrite: boolean = false
): CopyResult {
  try {
    if (!fs.existsSync(source)) {
      return {
        success: false,
        source,
        destination,
        error: `Source file does not exist: ${source}`,
      };
    }

    // Check if destination already exists
    if (fs.existsSync(destination) && !forceOverwrite) {
      // Compare file contents to see if update is needed
      const sourceContent = fs.readFileSync(source);
      const destContent = fs.readFileSync(destination);

      if (sourceContent.equals(destContent)) {
        // Files are identical, skip copy
        return {
          success: true,
          source,
          destination,
        };
      }
    }

    // Ensure destination directory exists
    const destDir = path.dirname(destination);
    ensureDirectoryExists(destDir);

    // Copy the file
    fs.copyFileSync(source, destination);

    return {
      success: true,
      source,
      destination,
    };
  } catch (error) {
    return {
      success: false,
      source,
      destination,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Recursively copies a directory
 */
function copyDirectory(
  source: string,
  destination: string,
  forceOverwrite: boolean = false
): CopyResult[] {
  const results: CopyResult[] = [];

  if (!fs.existsSync(source)) {
    results.push({
      success: false,
      source,
      destination,
      error: `Source directory does not exist: ${source}`,
    });
    return results;
  }

  // Ensure destination exists
  ensureDirectoryExists(destination);

  // Read directory contents
  const items = fs.readdirSync(source, { withFileTypes: true });

  for (const item of items) {
    const sourcePath = path.join(source, item.name);
    const destPath = path.join(destination, item.name);

    if (item.isDirectory()) {
      // Recursively copy subdirectory
      results.push(...copyDirectory(sourcePath, destPath, forceOverwrite));
    } else if (item.isFile()) {
      // Copy file
      results.push(copyFile(sourcePath, destPath, forceOverwrite));
    }
  }

  return results;
}

/**
 * Gets all package directories recursively
 */
function getPackageDirectories(baseDir: string = PACKAGES_DIR): string[] {
  const packages: string[] = [];

  function scanDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      return;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      if (!item.isDirectory() || item.name.startsWith('.')) {
        continue;
      }

      const itemPath = path.join(dir, item.name);

      // Check if this directory is a package (has package.json)
      const packageJsonPath = path.join(itemPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        packages.push(itemPath);
      }

      // Skip node_modules, dist, build, etc.
      const skipDirs = ['node_modules', 'dist', 'build', '.turbo', 'coverage', '.next'];
      if (skipDirs.includes(item.name)) {
        continue;
      }

      // Check for nested packages directory (for nested monorepos)
      const nestedPackagesDir = path.join(itemPath, 'packages');
      if (fs.existsSync(nestedPackagesDir)) {
        scanDirectory(nestedPackagesDir);
      }

      // Also check if this might be a workspace with different structure
      const possibleWorkspaceDirs = ['apps', 'libs', 'services', 'tools'];
      for (const workspaceDir of possibleWorkspaceDirs) {
        const workspacePath = path.join(itemPath, workspaceDir);
        if (fs.existsSync(workspacePath)) {
          scanDirectory(workspacePath);
        }
      }
    }
  }

  // Start scanning from the base packages directory
  scanDirectory(baseDir);

  // Also check the project root for potential packages
  const rootItems = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true });
  for (const item of rootItems) {
    if (!item.isDirectory() || item.name === 'packages' || item.name.startsWith('.')) {
      continue;
    }

    const itemPath = path.join(PROJECT_ROOT, item.name);
    const packageJsonPath = path.join(itemPath, 'package.json');

    // Check if it's a package but not in packages/ directory
    if (fs.existsSync(packageJsonPath) && item.name !== 'node_modules') {
      const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      // Only include if it's part of the workspace
      if (pkgJson.name && !pkgJson.private === false) {
        packages.push(itemPath);
      }
    }
  }

  // Remove duplicates and sort
  return packages;
}

/**
 * Checks if gitignore contains required entries and adds them if missing
 */
function updateGitignore(gitignorePath: string): void {
  let gitignoreContent = '';
  let hasChanges = false;

  // Read existing gitignore if it exists
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  }

  // Check each required entry
  for (const entry of GITIGNORE_ENTRIES) {
    // Check if entry already exists (accounting for comments and variations)
    const regex = new RegExp(`^\\s*${entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');

    if (!regex.test(gitignoreContent)) {
      // Add the entry
      if (gitignoreContent && !gitignoreContent.endsWith('\n')) {
        gitignoreContent += '\n';
      }
      gitignoreContent += `${entry}\n`;
      hasChanges = true;
      console.log(`  ✓ Added to .gitignore: ${entry}`);
    }
  }

  // Write back if there were changes
  if (hasChanges) {
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log(`✓ Updated .gitignore: ${gitignorePath}`);
  }
}

/**
 * Main setup function
 */
function setupAgentFiles(): void {
  console.log('🚀 Setting up agent files...\n');

  // Check for --force flag
  const forceOverwrite = process.argv.includes('--force');
  if (forceOverwrite) {
    console.log('⚠️  Force overwrite mode enabled\n');
  }

  const allResults: CopyResult[] = [];
  let skippedCount = 0;
  let updatedCount = 0;

  // 1. Set up root .cursor directory
  console.log('📁 Setting up root .cursor directory...');
  const rootCursorDir = path.join(PROJECT_ROOT, '.cursor');
  const rootCursorRulesDir = path.join(rootCursorDir, 'rules');

  ensureDirectoryExists(rootCursorRulesDir);

  // Copy cursor rules to root
  const cursorRulesResults = copyDirectory(
    CURSOR_RULES_SOURCE_DIR,
    rootCursorRulesDir,
    forceOverwrite
  );
  allResults.push(...cursorRulesResults);

  // 2. Copy AGENTS.md to root as both AGENTS.md and CLAUDE.md
  console.log('\n📄 Copying documentation files to root...');

  const rootAgentsResult = copyFile(
    AGENTS_MD_SOURCE,
    path.join(PROJECT_ROOT, 'AGENTS.md'),
    forceOverwrite
  );
  allResults.push(rootAgentsResult);

  const rootClaudeResult = copyFile(
    AGENTS_MD_SOURCE,
    path.join(PROJECT_ROOT, 'CLAUDE.md'),
    forceOverwrite
  );
  allResults.push(rootClaudeResult);

  // 3. Process each package
  console.log('\n📦 Processing packages...');
  const packageDirs = getPackageDirectories();

  for (const packageDir of packageDirs) {
    const packageName = path.basename(packageDir);
    console.log(`\n  📦 Processing package: ${packageName}`);

    // Set up .cursor directory in package
    const packageCursorDir = path.join(packageDir, '.cursor');
    const packageCursorRulesDir = path.join(packageCursorDir, 'rules');

    ensureDirectoryExists(packageCursorRulesDir);

    // Copy cursor rules
    const packageCursorResults = copyDirectory(
      CURSOR_RULES_SOURCE_DIR,
      packageCursorRulesDir,
      forceOverwrite
    );
    allResults.push(...packageCursorResults);

    // Copy AGENTS.md and CLAUDE.md
    const packageAgentsResult = copyFile(
      AGENTS_MD_SOURCE,
      path.join(packageDir, 'AGENTS.md'),
      forceOverwrite
    );
    allResults.push(packageAgentsResult);

    const packageClaudeResult = copyFile(
      AGENTS_MD_SOURCE,
      path.join(packageDir, 'CLAUDE.md'),
      forceOverwrite
    );
    allResults.push(packageClaudeResult);
  }

  // 4. Update .gitignore files
  console.log('\n📝 Updating .gitignore files...');

  // Root .gitignore
  const rootGitignore = path.join(PROJECT_ROOT, '.gitignore');
  updateGitignore(rootGitignore);

  // Package .gitignore files
  for (const packageDir of packageDirs) {
    const packageGitignore = path.join(packageDir, '.gitignore');
    if (fs.existsSync(packageGitignore)) {
      console.log(`\n  Checking ${path.basename(packageDir)}/.gitignore...`);
      updateGitignore(packageGitignore);
    }
  }

  // 5. Summary
  console.log('\n📊 Summary:');
  const successful = allResults.filter((r) => r.success).length;
  const failed = allResults.filter((r) => !r.success).length;

  console.log(`  ✓ Files processed: ${successful}`);
  console.log(`  ✗ Failed operations: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed operations:');
    allResults
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.source} → ${r.destination}`);
        console.log(`    Error: ${r.error}`);
      });
  }

  console.log('\n✅ Agent files setup complete!');
  if (!forceOverwrite && successful > 0) {
    console.log('💡 Tip: Use --force flag to overwrite existing files');
  }
}

// Run the setup
try {
  setupAgentFiles();
} catch (error) {
  console.error('❌ Setup failed:', error);
  process.exit(1);
}
