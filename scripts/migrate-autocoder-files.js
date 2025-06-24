#!/usr/bin/env node

/**
 * Migration script to move all autocoder-related files to .eliza directory
 * This includes:
 * - test-key directories and their archives
 * - test-api-key directories
 * - fallback-api-key directories
 * - test-benchmark directories
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple path helpers
const projectRoot = process.cwd();
const elizaDir = path.join(projectRoot, '.eliza');

function ensureProjectElizaDirs() {
  const dirs = [
    elizaDir,
    path.join(elizaDir, 'data'),
    path.join(elizaDir, 'data', 'plugins'),
    path.join(elizaDir, 'data', 'plugins', 'autocoder'),
    path.join(elizaDir, 'api-keys'),
  ];
  
  for (const dir of dirs) {
    fs.ensureDirSync(dir);
  }
}

function getApiKeyTestPath(keyType) {
  return path.join(elizaDir, 'api-keys', keyType);
}

function getPluginDataPath(pluginName, subpath) {
  const pluginDir = path.join(elizaDir, 'data', 'plugins', pluginName);
  return subpath ? path.join(pluginDir, subpath) : pluginDir;
}

// Directories to migrate
const DIRECTORIES_TO_MIGRATE = [
  { name: 'test-key', type: 'api-keys' },
  { name: 'test-api-key', type: 'api-keys' },
  { name: 'fallback-api-key', type: 'api-keys' },
  { name: 'test-benchmark', type: 'benchmarks' }
];

// Locations to check for these directories
const LOCATIONS_TO_CHECK = [
  process.cwd(), // Root directory
  path.join(process.cwd(), 'packages/plugin-autocoder'),
  ...fs.readdirSync(path.join(process.cwd(), 'packages'))
    .filter(pkg => pkg.startsWith('plugin-'))
    .map(pkg => path.join(process.cwd(), 'packages', pkg))
];

console.log('🔄 Starting migration of autocoder files to .eliza directory...\n');

// Ensure .eliza directories exist
ensureProjectElizaDirs();

let migratedCount = 0;
let failedCount = 0;

// Function to migrate a directory
async function migrateDirectory(sourcePath, targetType, dirName) {
  try {
    const stats = await fs.stat(sourcePath);
    if (!stats.isDirectory()) return false;

    // Determine target path based on type
    let targetPath;
    if (targetType === 'api-keys') {
      targetPath = getApiKeyTestPath(dirName);
    } else if (targetType === 'benchmarks') {
      targetPath = getPluginDataPath('autocoder', `benchmarks/${dirName}`);
    } else {
      targetPath = getPluginDataPath('autocoder', dirName);
    }

    // Create target directory if it doesn't exist
    await fs.ensureDir(targetPath);

    // Move all contents
    const items = await fs.readdir(sourcePath);
    for (const item of items) {
      const sourceItem = path.join(sourcePath, item);
      const targetItem = path.join(targetPath, item);

      try {
        const stats = await fs.stat(sourceItem);
        
        if (stats.isDirectory()) {
          // For directories, merge contents
          await fs.ensureDir(targetItem);
          const subItems = await fs.readdir(sourceItem);
          
          for (const subItem of subItems) {
            const subSource = path.join(sourceItem, subItem);
            const subTarget = path.join(targetItem, subItem);
            
            if (!await fs.pathExists(subTarget)) {
              await fs.move(subSource, subTarget);
              console.log(`   ✅ Moved: ${item}/${subItem}`);
            } else {
              console.log(`   ⚠️  Skipping ${item}/${subItem} (already exists)`);
            }
          }
          
          // Remove source directory if empty
          const remaining = await fs.readdir(sourceItem);
          if (remaining.length === 0) {
            await fs.remove(sourceItem);
          }
        } else {
          // For files, check if target exists
          if (await fs.pathExists(targetItem)) {
            console.log(`   ⚠️  Skipping ${item} (already exists in target)`);
            continue;
          }
          
          // Move the file
          await fs.move(sourceItem, targetItem);
          console.log(`   ✅ Moved: ${item}`);
        }
      } catch (err) {
        console.error(`   ❌ Failed to move ${item}: ${err.message}`);
        failedCount++;
      }
    }

    // Remove the source directory if it's empty
    const remainingItems = await fs.readdir(sourcePath);
    if (remainingItems.length === 0) {
      await fs.remove(sourcePath);
      console.log(`   🗑️  Removed empty directory: ${sourcePath}`);
    }

    return true;
  } catch (err) {
    console.error(`❌ Error migrating ${sourcePath}: ${err.message}`);
    failedCount++;
    return false;
  }
}

// Main migration process
async function migrate() {
  for (const location of LOCATIONS_TO_CHECK) {
    if (!await fs.pathExists(location)) continue;

    console.log(`\n📁 Checking location: ${location}`);

    for (const { name, type } of DIRECTORIES_TO_MIGRATE) {
      const sourcePath = path.join(location, name);

      if (await fs.pathExists(sourcePath)) {
        console.log(`\n📦 Found ${name} directory`);
        const success = await migrateDirectory(sourcePath, type, name);
        if (success) migratedCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Migration complete!`);
  console.log(`   - Directories migrated: ${migratedCount}`);
  if (failedCount > 0) {
    console.log(`   - Failed operations: ${failedCount}`);
  }
  console.log('='.repeat(60) + '\n');

  // Update .gitignore if needed
  await updateGitignore();
}

// Update .gitignore to ensure new paths are ignored
async function updateGitignore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  
  try {
    let content = await fs.readFile(gitignorePath, 'utf-8');
    const linesToAdd = [];

    // Check if .eliza is already ignored
    if (!content.includes('.eliza/')) {
      linesToAdd.push('.eliza/');
    }

    // Remove old entries if they exist
    const oldPatterns = [
      'test-key/',
      'test-api-key/',
      'fallback-api-key/',
      'test-benchmark/',
      '**/test-key/',
      '**/test-api-key/',
      '**/fallback-api-key/',
      '**/test-benchmark/'
    ];

    for (const pattern of oldPatterns) {
      content = content.split('\n')
        .filter(line => !line.trim().startsWith(pattern))
        .join('\n');
    }

    // Add new lines if needed
    if (linesToAdd.length > 0) {
      content = content.trim() + '\n\n# ElizaOS centralized data directory\n' + linesToAdd.join('\n') + '\n';
      await fs.writeFile(gitignorePath, content);
      console.log('✅ Updated .gitignore');
    }
  } catch (err) {
    console.error('⚠️  Could not update .gitignore:', err.message);
  }
}

// Run the migration
migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
}); 