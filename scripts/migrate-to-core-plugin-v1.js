#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const ANALYZE_ONLY = args.includes('--analyze-only');
const VERBOSE = args.includes('--verbose');

// Get target directory or repository URL
let targetPath = process.cwd(); // Default to current directory
let isGitRepo = false;
let repoName = '';
let tempDir = '';

// Look for path or URL argument
for (const arg of args) {
  if (!arg.startsWith('--') && arg.length > 0) {
    // Check if it's a GitHub URL
    if (arg.startsWith('https://github.com/') || arg.startsWith('git@github.com:')) {
      isGitRepo = true;
      // Extract repo name from URL
      const urlParts = arg.split('/');
      repoName = urlParts[urlParts.length - 1].replace('.git', '');
      
      // Clone directly to current directory
      targetPath = path.join(process.cwd(), repoName);
      
      // Clone the repository
      console.log(`Cloning repository ${arg} to ${targetPath}...`);
      try {
        execSync(`git clone ${arg} ${targetPath}`, { stdio: 'inherit' });
        console.log(`Repository cloned successfully to ${targetPath}`);
      } catch (error) {
        console.error(`Error cloning repository: ${error.message}`);
        process.exit(1);
      }
    } else {
      // It's a local path
      targetPath = path.resolve(arg);
      if (!fs.existsSync(targetPath)) {
        console.error(`Error: Path ${targetPath} does not exist.`);
        process.exit(1);
      }
    }
    break;
  }
}

// Configuration
const PACKAGES_DIR = path.join(targetPath, 'packages');
const OLD_IMPORT = '@elizaos/core';
const NEW_IMPORT = '@elizaos/core-plugin-v1';

// Find all plugin directories
function getPluginDirectories() {
  if (!fs.existsSync(PACKAGES_DIR)) {
    console.error(`Error: Packages directory not found at ${PACKAGES_DIR}.`);
    console.error(`Make sure you're running the script on a valid Eliza repository.`);
    process.exit(1);
  }

  const dirs = fs.readdirSync(PACKAGES_DIR)
    .filter(dir => 
      dir.startsWith('plugin-') && 
      fs.statSync(path.join(PACKAGES_DIR, dir)).isDirectory()
    )
    .map(dir => path.join(PACKAGES_DIR, dir));
  
  console.log(`Found ${dirs.length} plugin directories`);
  return dirs;
}

// Find ALL references to @elizaos/core in a directory
function findAllReferences(pluginDir) {
  try {
    const result = execSync(
      `grep -r "${OLD_IMPORT}" "${pluginDir}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    
    return result ? result.split('\n') : [];
  } catch (error) {
    // grep returns non-zero if no matches, which is not an error for us
    return [];
  }
}

// Check if directory has @elizaos/core in node_modules
function hasCoreDependency(pluginDir) {
  const corePath = path.join(pluginDir, 'node_modules', '@elizaos', 'core');
  return fs.existsSync(corePath);
}

// Replace @elizaos/core with @elizaos/core-plugin-v1 in a file
function replaceInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const newContent = content.replace(new RegExp(OLD_IMPORT, 'g'), NEW_IMPORT);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error replacing in ${filePath}: ${error.message}`);
    return false;
  }
}

// Migrate all references in a single plugin
function migratePlugin(plugin) {
  console.log(`\nMigrating ${plugin.name}...`);
  const results = {
    files: 0,
    packageJson: false,
    tsupConfig: false,
    nodeModules: false
  };

  // 1. Replace all text references in files
  if (plugin.references.length > 0) {
    const filesToUpdate = new Set();
    
    for (const ref of plugin.references) {
      const parts = ref.split(':');
      if (parts.length >= 1) {
        filesToUpdate.add(parts[0]);
      }
    }
    
    for (const file of filesToUpdate) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Use a regex that will only match the exact string @elizaos/core
        // This prevents double replacements (@elizaos/core-plugin-v1-plugin-v1)
        // Using word boundary \b to ensure we don't replace partial matches
        const regex = new RegExp(`\\b${OLD_IMPORT}\\b`, 'g');
        const newContent = content.replace(regex, NEW_IMPORT);
        
        if (content !== newContent) {
          fs.writeFileSync(file, newContent);
          results.files++;
          console.log(`  Updated file: ${file}`);
        }
      } catch (error) {
        console.error(`  Error updating ${file}: ${error.message}`);
      }
    }
  }

  // 2. Update package.json
  const packageJsonPath = path.join(plugin.path, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      let updated = false;
      
      if (packageJson.dependencies && packageJson.dependencies[OLD_IMPORT]) {
        const version = packageJson.dependencies[OLD_IMPORT];
        packageJson.dependencies[NEW_IMPORT] = version;
        delete packageJson.dependencies[OLD_IMPORT];
        updated = true;
      }
      
      if (packageJson.devDependencies && packageJson.devDependencies[OLD_IMPORT]) {
        const version = packageJson.devDependencies[OLD_IMPORT];
        packageJson.devDependencies[NEW_IMPORT] = version;
        delete packageJson.devDependencies[OLD_IMPORT];
        updated = true;
      }
      
      if (updated) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        results.packageJson = true;
        console.log(`  Updated package.json`);
      }
    } catch (error) {
      console.error(`  Error updating package.json: ${error.message}`);
    }
  }

  // 3. Update tsup.config.ts if it exists
  const tsupConfigPath = path.join(plugin.path, 'tsup.config.ts');
  if (fs.existsSync(tsupConfigPath)) {
    try {
      const content = fs.readFileSync(tsupConfigPath, 'utf-8');
      
      // Use the same word boundary approach for tsup.config.ts
      const regex = new RegExp(`external\\s*:\\s*\\[[^\\]]*\\b${OLD_IMPORT}\\b[^\\]]*\\]`, 'g');
      const newContent = content.replace(regex, match => match.replace(OLD_IMPORT, NEW_IMPORT));
      
      if (content !== newContent) {
        fs.writeFileSync(tsupConfigPath, newContent);
        results.tsupConfig = true;
        console.log(`  Updated tsup.config.ts`);
      }
    } catch (error) {
      console.error(`  Error updating tsup.config.ts: ${error.message}`);
    }
  }

  // 4. Print a message about node_modules if needed
  if (plugin.hasNodeModulesCore) {
    results.nodeModules = true;
    console.log(`  Found @elizaos/core in node_modules - will need to reinstall dependencies`);
  }

  // Summary for this plugin
  let actionItems = [];
  if (results.files > 0) {
    actionItems.push(`replaced references in ${results.files} files`);
  }
  if (results.packageJson) {
    actionItems.push('updated package.json');
  }
  if (results.tsupConfig) {
    actionItems.push('updated tsup.config.ts');
  }
  if (results.nodeModules) {
    actionItems.push('found node_modules that need reinstallation');
  }
  
  if (actionItems.length > 0) {
    console.log(`  ✅ Migration actions: ${actionItems.join(', ')}`);
    
    // Additional instructions based on plugin type
    if (plugin.hasSrcRefs) {
      console.log(`  ⚠️ This plugin has source code references - rebuild it after migration with 'npm run build'`);
    }
    if (plugin.hasNodeModulesCore) {
      console.log(`  ⚠️ Remove node_modules and reinstall dependencies to complete migration`);
    }
  } else {
    console.log(`  ⚠️ No changes made to this plugin - manual inspection recommended`);
  }
  
  return results;
}

// Rebuild a plugin after migration
function rebuildPlugin(plugin) {
  console.log(`\nRebuilding ${plugin.name}...`);
  
  try {
    // Check if package.json exists and has a build script
    const packageJsonPath = path.join(plugin.path, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log(`  ⚠️ No package.json found for ${plugin.name}, skipping rebuild`);
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (!packageJson.scripts || !packageJson.scripts.build) {
      console.log(`  ⚠️ No build script found in package.json for ${plugin.name}, skipping rebuild`);
      return false;
    }

    // Execute the build script
    console.log(`  Running npm install && npm run build in ${plugin.path}...`);
    
    // First, install dependencies
    execSync('npm install', { 
      cwd: plugin.path, 
      stdio: 'inherit' 
    });
    
    // Then build the project
    execSync('npm run build', { 
      cwd: plugin.path, 
      stdio: 'inherit'
    });
    
    console.log(`  ✅ Successfully rebuilt ${plugin.name}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error rebuilding ${plugin.name}: ${error.message}`);
    return false;
  }
}

// Clean and reinstall dependencies for a plugin
function reinstallDependencies(plugin) {
  console.log(`\nReinstalling dependencies for ${plugin.name}...`);
  
  try {
    const nodeModulesPath = path.join(plugin.path, 'node_modules');
    
    // Check if node_modules exists
    if (!fs.existsSync(nodeModulesPath)) {
      console.log(`  No node_modules directory found for ${plugin.name}, just installing`);
    } else {
      // Remove node_modules
      console.log(`  Removing node_modules directory...`);
      execSync(`rm -rf ${nodeModulesPath}`, { 
        stdio: 'inherit' 
      });
    }
    
    // Install dependencies
    console.log(`  Installing dependencies...`);
    execSync('npm install', { 
      cwd: plugin.path, 
      stdio: 'inherit' 
    });
    
    console.log(`  ✅ Successfully reinstalled dependencies for ${plugin.name}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error reinstalling dependencies for ${plugin.name}: ${error.message}`);
    return false;
  }
}

// Main function
function main() {
  const pluginDirs = getPluginDirectories();
  const results = [];
  
  console.log(`\nScanning plugins for @elizaos/core references...`);
  
  for (const pluginDir of pluginDirs) {
    const pluginName = path.basename(pluginDir);
    
    // Show progress
    process.stdout.write(`Scanning ${pluginName}... `);
    
    // Check for references and node_modules
    const references = findAllReferences(pluginDir);
    const hasNodeModulesCore = hasCoreDependency(pluginDir);
    
    // Check for specific reference locations
    const hasSrcRefs = references.some(ref => ref.includes('/src/'));
    const hasDistRefs = references.some(ref => ref.includes('/dist/'));
    const hasPackageJsonRefs = references.some(ref => ref.endsWith('package.json:'));
    
    // Update progress
    if (references.length > 0 || hasNodeModulesCore) {
      process.stdout.write(`found ${references.length} references${hasNodeModulesCore ? ' + node_modules' : ''}\n`);
    } else {
      process.stdout.write(`no references\n`);
    }
    
    results.push({
      name: pluginName,
      path: pluginDir,
      references,
      hasNodeModulesCore,
      hasSrcRefs,
      hasDistRefs,
      hasPackageJsonRefs
    });
  }
  
  // Categorize plugins
  const categories = {
    srcAndDist: results.filter(p => p.hasSrcRefs && p.hasDistRefs),
    srcOnly: results.filter(p => p.hasSrcRefs && !p.hasDistRefs),
    distOnly: results.filter(p => !p.hasSrcRefs && p.hasDistRefs),
    packageJsonOnly: results.filter(p => !p.hasSrcRefs && !p.hasDistRefs && p.hasPackageJsonRefs),
    nodeModulesOnly: results.filter(p => !p.hasSrcRefs && !p.hasDistRefs && !p.hasPackageJsonRefs && p.hasNodeModulesCore),
    otherRefsOnly: results.filter(p => !p.hasSrcRefs && !p.hasDistRefs && !p.hasPackageJsonRefs && !p.hasNodeModulesCore && p.references.length > 0)
  };
  
  // Count plugins with any references
  const pluginsWithRefs = results.filter(p => p.references.length > 0 || p.hasNodeModulesCore);
  
  // Display summary
  console.log('\nAnalysis Summary:');
  console.log(`Total plugins: ${results.length}`);
  console.log(`Plugins with @elizaos/core references: ${pluginsWithRefs.length}`);
  console.log('\nPlugins by category:');
  console.log(`- Source and dist references: ${categories.srcAndDist.length}`);
  console.log(`- Source references only: ${categories.srcOnly.length}`);
  console.log(`- Dist references only: ${categories.distOnly.length}`);
  console.log(`- Package.json references only: ${categories.packageJsonOnly.length}`);
  console.log(`- Node modules references only: ${categories.nodeModulesOnly.length}`);
  console.log(`- Other references only: ${categories.otherRefsOnly.length}`);
  
  // Migrate if not analyze-only
  if (!ANALYZE_ONLY) {
    console.log('\nStarting migration...');
    
    const migrationStats = {
      filesUpdated: 0,
      packagesUpdated: 0,
      configsUpdated: 0,
      nodeModulesFound: 0,
      pluginsRebuilt: 0,
      dependenciesReinstalled: 0,
      totalPlugins: pluginsWithRefs.length
    };
    
    let current = 0;
    for (const plugin of pluginsWithRefs) {
      current++;
      console.log(`\n[${current}/${pluginsWithRefs.length}] Processing plugin: ${plugin.name}`);
      
      // Step 1: Migrate references
      const results = migratePlugin(plugin);
      
      migrationStats.filesUpdated += results.files;
      migrationStats.packagesUpdated += results.packageJson ? 1 : 0;
      migrationStats.configsUpdated += results.tsupConfig ? 1 : 0;
      migrationStats.nodeModulesFound += results.nodeModules ? 1 : 0;
      
      // Step 2: For plugins with node_modules/@elizaos/core, reinstall dependencies
      if (results.nodeModules) {
        const reinstalled = reinstallDependencies(plugin);
        if (reinstalled) {
          migrationStats.dependenciesReinstalled++;
        }
      }
      
      // Step 3: For plugins with source references that were updated, rebuild
      if (results.files > 0 && plugin.hasSrcRefs) {
        const rebuilt = rebuildPlugin(plugin);
        if (rebuilt) {
          migrationStats.pluginsRebuilt++;
        }
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total plugins processed: ${migrationStats.totalPlugins}`);
    console.log(`Files updated: ${migrationStats.filesUpdated}`);
    console.log(`Package.json files updated: ${migrationStats.packagesUpdated}`);
    console.log(`Build configs updated: ${migrationStats.configsUpdated}`);
    console.log(`Plugins with node_modules/@elizaos/core: ${migrationStats.nodeModulesFound}`);
    console.log(`Plugins with dependencies reinstalled: ${migrationStats.dependenciesReinstalled}`);
    console.log(`Plugins rebuilt: ${migrationStats.pluginsRebuilt}`);
    
    console.log('\n=== Next Steps ===');
    console.log('1. Verify that imports work correctly in all plugins');
    console.log('2. Test functionality to ensure the migration was successful');
  } else {
    console.log('\nAnalysis complete. Run without --analyze-only to perform migration.');
  }

  // Just add a message about completing migration
  if (isGitRepo) {
    console.log(`\nMigration completed for repository at ${targetPath}`);
    console.log(`You can review the changes and commit them manually if needed.`);
  }
}

// Add help/usage information
function printUsage() {
  console.log(`
Usage:
  node migrate-to-core-plugin-v1.js [options] [path|url]

Arguments:
  path                    Local directory containing Eliza plugins (default: current directory)
  url                     GitHub repository URL to clone and migrate

Options:
  --analyze-only          Only analyze plugins, don't perform migration
  --verbose               Show more detailed output

Examples:
  node migrate-to-core-plugin-v1.js                           # Migrate plugins in current directory
  node migrate-to-core-plugin-v1.js /path/to/eliza            # Migrate plugins in specified directory
  node migrate-to-core-plugin-v1.js --analyze-only            # Analyze only without migrating
  node migrate-to-core-plugin-v1.js https://github.com/user/eliza.git  # Clone and migrate GitHub repo
`);
}

// Check if help was requested
if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

main(); 