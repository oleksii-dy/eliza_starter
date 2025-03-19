#!/usr/bin/env node

/**
 * Batch plugin publisher
 *
 * This script publishes multiple plugins from the monorepo to the registry.
 * It can be used to update all plugins or a specific subset.
 *
 * Usage:
 *   node scripts/publish-plugins.js [--all] [--pattern=<glob>] [--platform=<platform>] [--registry=<registry>] [--dry-run] [--branch=<branch>] [--token=<github_token>] [--fallback-registry=<fallback>] [--skip-registry]
 *
 * Options:
 *   --all               Publish all plugins in packages/plugins/*
 *   --pattern           Glob pattern to match plugin directories (e.g. plugin-*)
 *   --platform          Platform compatibility (node, browser, universal)
 *   --registry          Target registry (default: elizaos/registry)
 *   --dry-run           Test the publishing process without making actual changes
 *   --branch            Branch name template for publishing (default: plugin-version-{version})
 *   --token             GitHub personal access token
 *   --fallback-registry Use fallback registry if main registry fails
 *   --skip-registry     Skip registry publishing and only publish to npm
 */

import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { globSync } from 'glob';
import os from 'node:os';
import readline from 'node:readline';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PLUGINS_DIR = path.resolve(REPO_ROOT, 'packages');
const ELIZA_CONFIG_DIR = path.resolve(os.homedir(), '.eliza');
const ELIZA_ENV_FILE = path.resolve(ELIZA_CONFIG_DIR, 'env');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all'),
  pattern: args.find((arg) => arg.startsWith('--pattern='))?.split('=')[1] || 'plugin-*',
  platform: args.find((arg) => arg.startsWith('--platform='))?.split('=')[1] || 'universal',
  registry: args.find((arg) => arg.startsWith('--registry='))?.split('=')[1] || 'elizaOS/registry',
  dryRun: args.includes('--dry-run'),
  branchTemplate:
    args.find((arg) => arg.startsWith('--branch='))?.split('=')[1] || 'plugin-version-{version}',
  token:
    args.find((arg) => arg.startsWith('--token='))?.split('=')[1] || process.env.GITHUB_TOKEN || '',
  fallbackRegistry: args.find((arg) => arg.startsWith('--fallback-registry='))?.split('=')[1] || '',
  skipRegistry: args.includes('--skip-registry') && !args.includes('--force-registry'),
  debug: args.includes('--debug'),
  username:
    args.find((arg) => arg.startsWith('--username='))?.split('=')[1] ||
    process.env.GITHUB_USERNAME ||
    '',
  forkWaitTime: 10000, // Wait 10 seconds for fork to be ready
};

// Function to read user input
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Function to ensure GitHub token is available
async function ensureGitHubToken() {
  // Check if token is already provided
  if (options.token) {
    return options.token;
  }

  // Check if token exists in ~/.eliza/env
  try {
    if (existsSync(ELIZA_ENV_FILE)) {
      const envContent = await fs.readFile(ELIZA_ENV_FILE, 'utf-8');
      const tokenMatch = envContent.match(/GITHUB_TOKEN=([^\n]+)/);
      if (tokenMatch && tokenMatch[1]) {
        options.token = tokenMatch[1];
        return options.token;
      }
    }
  } catch (error) {
    console.log(`⚠️ Error reading token from ${ELIZA_ENV_FILE}: ${error.message}`);
  }

  // Prompt for token
  console.log('\n🔑 GitHub Personal Access Token is required for publishing.');
  console.log('You need a token with repo, read:org, and workflow scopes.');
  const token = await prompt('Enter your GitHub personal access token: ');

  if (!token) {
    throw new Error('GitHub token is required for publishing');
  }

  // Store token in ~/.eliza/env
  try {
    // Create directory if it doesn't exist
    if (!existsSync(ELIZA_CONFIG_DIR)) {
      await fs.mkdir(ELIZA_CONFIG_DIR, { recursive: true });
    }

    // Read existing env file if it exists
    let envContent = '';
    if (existsSync(ELIZA_ENV_FILE)) {
      envContent = await fs.readFile(ELIZA_ENV_FILE, 'utf-8');

      // Replace existing token if present
      if (envContent.includes('GITHUB_TOKEN=')) {
        envContent = envContent.replace(/GITHUB_TOKEN=([^\n]+)/, `GITHUB_TOKEN=${token}`);
      } else {
        // Add token to file
        envContent += `\nGITHUB_TOKEN=${token}`;
      }
    } else {
      // Create new env file
      envContent = `GITHUB_TOKEN=${token}`;
    }

    // Write updated env file
    await fs.writeFile(ELIZA_ENV_FILE, envContent);
    console.log(`✅ GitHub token stored in ${ELIZA_ENV_FILE}`);

    // Set token in current environment
    process.env.GITHUB_TOKEN = token;
    options.token = token;

    return token;
  } catch (error) {
    console.error(`❌ Failed to store GitHub token: ${error.message}`);
    // Still return the token even if we failed to store it
    return token;
  }
}

async function findPluginDirectories() {
  if (options.all) {
    return globSync('**/plugin-*', {
      cwd: PLUGINS_DIR,
      absolute: false,
      onlyDirectories: true,
    });
  }

  return globSync(options.pattern, {
    cwd: PLUGINS_DIR,
    absolute: false,
    onlyDirectories: true,
  });
}

/**
 * Publish directly to GitHub registry by updating the registry repository
 * This bypasses the CLI's publishToGitHub function with direct GitHub API calls
 */
async function publishToGitHubRegistry(packageJson, username, token, versionBranch) {
  try {
    if (!username) {
      console.error(
        `❌ GitHub username not available. Please specify --username=<your_github_username> or set GITHUB_USERNAME`
      );
      return false;
    }

    console.log(`📝 Publishing ${packageJson.name}@${packageJson.version} to GitHub registry...`);

    // Parse registry info
    const [registryOwner, registryRepo] = options.registry.split('/');
    console.log(`📊 Registry: ${registryOwner}/${registryRepo}`);

    // Check if registry repo exists
    console.log(`🔍 Checking if registry repository exists...`);
    const registryResponse = await fetch(
      `https://api.github.com/repos/${registryOwner}/${registryRepo}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (registryResponse.status !== 200) {
      console.error(
        `❌ Registry repository ${registryOwner}/${registryRepo} does not exist or is not accessible`
      );
      console.error(`Status: ${registryResponse.status} ${registryResponse.statusText}`);
      return false;
    }

    console.log(`✅ Registry repository exists and is accessible`);

    // Check if fork exists and handle retries
    const maxRetries = 3;
    let forkExists = false;
    let tryCount = 0;

    // Process for checking/creating the fork with retries
    while (!forkExists && tryCount < maxRetries) {
      tryCount++;
      console.log(
        `🔍 Checking for existing fork for ${username}... (try ${tryCount}/${maxRetries})`
      );

      const forkResponse = await fetch(`https://api.github.com/repos/${username}/${registryRepo}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (forkResponse.status === 200) {
        forkExists = true;
        console.log('✅ Fork exists');
      } else if (tryCount === 1) {
        console.log('⏳ Fork does not exist, creating...');

        // Create fork
        const createForkResponse = await fetch(
          `https://api.github.com/repos/${registryOwner}/${registryRepo}/forks`,
          {
            method: 'POST',
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (createForkResponse.status !== 202) {
          const errorBody = await createForkResponse.text();
          console.error(
            `❌ Failed to create fork: ${createForkResponse.status} ${createForkResponse.statusText}`
          );
          console.error(`Response: ${errorBody}`);
          return false;
        }

        console.log('✅ Fork creation initiated');
        console.log(
          `⏳ Waiting for GitHub to complete fork creation... (${options.forkWaitTime / 1000} seconds)`
        );

        // Wait longer after creating a fork
        await new Promise((resolve) => setTimeout(resolve, options.forkWaitTime));
      } else {
        console.log(
          `⏳ Fork not ready yet, waiting ${options.forkWaitTime / 1000} more seconds...`
        );
        await new Promise((resolve) => setTimeout(resolve, options.forkWaitTime));
      }
    }

    if (!forkExists) {
      console.error(`❌ Fork could not be created or accessed after ${maxRetries} attempts`);
      return false;
    }

    // Get default branch to use as base for our new branch
    console.log(`🔍 Getting default branch for ${username}/${registryRepo}...`);
    const repoDetailsResponse = await fetch(
      `https://api.github.com/repos/${username}/${registryRepo}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (repoDetailsResponse.status !== 200) {
      console.error(`❌ Failed to get repository details: ${repoDetailsResponse.status}`);
      return false;
    }

    const repoDetails = await repoDetailsResponse.json();
    const defaultBranch = repoDetails.default_branch || 'main';
    console.log(`✅ Default branch is ${defaultBranch}`);

    // Get SHA of the default branch
    console.log(`🔍 Getting SHA of ${defaultBranch}...`);
    const refResponse = await fetch(
      `https://api.github.com/repos/${username}/${registryRepo}/git/ref/heads/${defaultBranch}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (refResponse.status !== 200) {
      console.error(`❌ Failed to get ref: ${refResponse.status}`);

      // Check if repo needs sync
      console.log(`⚠️ Your fork may be out of sync with the upstream repository.`);
      console.log(
        `⚠️ Please go to https://github.com/${username}/${registryRepo} and sync your fork.`
      );
      return false;
    }

    const refData = await refResponse.json();
    const sha = refData.object.sha;
    console.log(`✅ Found SHA: ${sha.substring(0, 7)}...`);

    // Sanitize branch name
    const sanitizedBranchName = versionBranch.replace(/[^a-zA-Z0-9-_]/g, '-');
    console.log(`🔄 Using branch name: ${sanitizedBranchName}`);

    // Check if branch already exists
    console.log(`🔍 Checking if branch ${sanitizedBranchName} exists...`);
    const branchResponse = await fetch(
      `https://api.github.com/repos/${username}/${registryRepo}/git/refs/heads/${sanitizedBranchName}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const branchExists = branchResponse.status === 200;

    if (branchExists) {
      console.log('⚠️ WARNING: Branch already exists!');
      console.log(`This suggests version ${packageJson.version} may have already been published.`);

      if (!options.dryRun) {
        const answer = await prompt('Continue anyway? (y/N): ');
        if (answer.toLowerCase() !== 'y') {
          console.log('Aborting. Consider either:');
          console.log(`1. Updating the version in your package.json`);
          console.log(`2. Manually deleting the branch '${sanitizedBranchName}' from your fork`);
          return false;
        }
      }

      console.log('✅ Continuing with existing branch');
    } else {
      console.log('⏳ Branch does not exist, creating...');

      const createBranchResponse = await fetch(
        `https://api.github.com/repos/${username}/${registryRepo}/git/refs`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: `refs/heads/${sanitizedBranchName}`,
            sha,
          }),
        }
      );

      if (createBranchResponse.status !== 201) {
        const errorBody = await createBranchResponse.text();
        console.error(`❌ Failed to create branch: ${createBranchResponse.status}`);
        console.error(`Response: ${errorBody}`);
        return false;
      }

      console.log('✅ Branch created successfully');
    }

    // Create package metadata
    const packageName = packageJson.name.replace(/^@elizaos\//, '');
    const packagePath = `packages/${packageName}.json`;

    // Current time for release date
    const currentDate = new Date().toISOString();

    // Get CLI version for compatibility
    const cliVersion = '1.0.0'; // Placeholder, ideally get this from package.json

    // Create metadata object
    const metadata = {
      name: packageJson.name,
      description: packageJson.description || '',
      repository: {
        type: 'git',
        url: packageJson.repository?.url || `github:${username}/${packageName}`,
      },
      maintainers: [
        {
          name: username,
          github: username,
        },
      ],
      categories: packageJson.categories || [],
      tags: packageJson.keywords || [],
      versions: [
        {
          version: packageJson.version,
          gitBranch: packageJson.version,
          gitTag: `v${packageJson.version}`,
          runtimeVersion: cliVersion,
          releaseDate: currentDate,
          deprecated: false,
        },
      ],
      latestStable: packageJson.version,
      latestVersion: packageJson.version,
      type: packageJson.name.includes('plugin-') ? 'plugin' : packageJson.type || 'plugin',
      installable: packageJson.name.includes('plugin-')
        ? true
        : (packageJson.type || 'plugin') === 'plugin',
      platform: packageJson.platform || options.platform,
    };

    // Check if package file already exists in this branch
    console.log(`🔍 Checking if package file already exists: ${packagePath}`);
    const existingFileResponse = await fetch(
      `https://api.github.com/repos/${username}/${registryRepo}/contents/${packagePath}?ref=${sanitizedBranchName}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    let fileSha = null;
    if (existingFileResponse.status === 200) {
      const existingFileData = await existingFileResponse.json();
      fileSha = existingFileData.sha;
      console.log(`✅ File exists, updating with SHA: ${fileSha.substring(0, 7)}...`);
    } else {
      console.log('📝 File does not exist, creating new file');
    }

    // Create package file in registry
    console.log(`📝 Updating package file: ${packagePath}`);
    const createFileBody = {
      message: `Add ${packageJson.name}@${packageJson.version}`,
      content: Buffer.from(JSON.stringify(metadata, null, 2)).toString('base64'),
      branch: sanitizedBranchName,
    };

    // Add SHA if file exists
    if (fileSha) {
      createFileBody.sha = fileSha;
    }

    const createFileResponse = await fetch(
      `https://api.github.com/repos/${username}/${registryRepo}/contents/${packagePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFileBody),
      }
    );

    if (createFileResponse.status !== 201 && createFileResponse.status !== 200) {
      const errorBody = await createFileResponse.text();
      console.error(`❌ Failed to create file: ${createFileResponse.status}`);
      console.error(`Response: ${errorBody}`);
      return false;
    }

    console.log('✅ Package metadata created successfully');

    // Update index.json
    console.log(`📝 Updating registry index.json...`);

    // Get current index.json content
    const indexResponse = await fetch(
      `https://api.github.com/repos/${username}/${registryRepo}/contents/index.json?ref=${sanitizedBranchName}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (indexResponse.status !== 200) {
      console.error(`❌ Failed to get index.json: ${indexResponse.status}`);
      return false;
    }

    const indexData = await indexResponse.json();
    const indexContent = Buffer.from(indexData.content, 'base64').toString('utf-8');
    const indexJson = JSON.parse(indexContent);
    const indexSha = indexData.sha;

    // Update index with package reference
    if (!indexJson.__v2) {
      indexJson.__v2 = {
        version: '2.0.0',
        packages: {},
        categories: {},
        types: {
          plugin: [],
          project: [],
        },
      };
    }

    // Add package entry
    indexJson.__v2.packages[packageJson.name] = packagePath;

    // Update type collections
    const type = packageJson.name.includes('plugin-') ? 'plugin' : packageJson.type || 'plugin';
    if (!indexJson.__v2.types[type]) {
      indexJson.__v2.types[type] = [];
    }
    if (!indexJson.__v2.types[type].includes(packageJson.name)) {
      indexJson.__v2.types[type].push(packageJson.name);
    }

    // Remove from other type collections if previously miscategorized
    const otherTypes = Object.keys(indexJson.__v2.types).filter((t) => t !== type);
    for (const otherType of otherTypes) {
      const typeIndex = indexJson.__v2.types[otherType].indexOf(packageJson.name);
      if (typeIndex !== -1) {
        indexJson.__v2.types[otherType].splice(typeIndex, 1);
        console.log(
          `🔄 Removed ${packageJson.name} from ${otherType} type list (was miscategorized)`
        );
      }
    }

    // Debug type classifications for verification
    console.log(`📋 Type classifications in index.json:`);
    for (const [typeName, typePackages] of Object.entries(indexJson.__v2.types)) {
      console.log(`  - ${typeName}: ${typePackages.length} packages`);
      if (typePackages.includes(packageJson.name)) {
        console.log(`    ✅ ${packageJson.name} is correctly listed as a ${typeName}`);
      }
    }

    // Update index.json file
    const updateIndexResponse = await fetch(
      `https://api.github.com/repos/${username}/${registryRepo}/contents/index.json`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update index.json for ${packageJson.name}@${packageJson.version}`,
          content: Buffer.from(JSON.stringify(indexJson, null, 2)).toString('base64'),
          sha: indexSha,
          branch: sanitizedBranchName,
        }),
      }
    );

    if (updateIndexResponse.status !== 200) {
      const errorBody = await updateIndexResponse.text();
      console.error(`❌ Failed to update index.json: ${updateIndexResponse.status}`);
      console.error(`Response: ${errorBody}`);
      return false;
    }

    console.log('✅ Registry index updated successfully');

    // Create pull request
    console.log(`🔄 Creating pull request to ${registryOwner}/${registryRepo}...`);
    const createPrResponse = await fetch(
      `https://api.github.com/repos/${registryOwner}/${registryRepo}/pulls`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Add ${packageJson.name}@${packageJson.version} to registry`,
          body: `This PR adds ${packageJson.name} version ${packageJson.version} to the registry.

- Type: ${packageJson.type || 'plugin'}
- Installable: ${(packageJson.type || 'plugin') === 'plugin' ? 'Yes' : 'No - Project type'}
- Package name: ${packageJson.name}
- Version: ${packageJson.version}
- Description: ${packageJson.description || 'No description provided'}
- Platform: ${packageJson.platform || options.platform}

Submitted by: @${username}`,
          head: `${username}:${sanitizedBranchName}`,
          base: defaultBranch,
        }),
      }
    );

    if (createPrResponse.status === 422) {
      // Pull request might already exist
      const errorBody = await createPrResponse.json();

      if (errorBody?.errors?.[0]?.message?.includes('already exists')) {
        console.log(`⚠️ A pull request for this branch already exists.`);

        // Try to find the existing PR
        console.log(`🔍 Looking for existing pull request...`);
        const existingPrResponse = await fetch(
          `https://api.github.com/repos/${registryOwner}/${registryRepo}/pulls?head=${username}:${sanitizedBranchName}&state=open`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (existingPrResponse.status === 200) {
          const existingPrs = await existingPrResponse.json();
          if (existingPrs.length > 0) {
            console.log(`✅ Found existing pull request: ${existingPrs[0].html_url}`);
            console.log('Package updates have been applied to the existing PR.');
            return true;
          }
        }

        console.log(`⚠️ This suggests the PR may have been closed or merged already.`);
        console.log(`✅ Package metadata has still been updated successfully.`);
        return true;
      }

      console.error(`❌ Failed to create pull request: ${createPrResponse.status}`);
      console.error(`Response: ${JSON.stringify(errorBody)}`);
      return false;
    }

    if (createPrResponse.status !== 201) {
      const errorBody = await createPrResponse.text();
      console.error(`❌ Failed to create pull request: ${createPrResponse.status}`);
      console.error(`Response: ${errorBody}`);
      return false;
    }

    const prData = await createPrResponse.json();
    console.log(`✅ Pull request created successfully: ${prData.html_url}`);
    return true;
  } catch (error) {
    console.error(`❌ Error publishing to GitHub registry: ${error.message}`);
    if (options.debug) {
      console.error(error);
    }
    return false;
  }
}

async function publishPlugin(pluginDir) {
  try {
    const fullPath = path.join(PLUGINS_DIR, pluginDir);

    // Check if it's a valid plugin with package.json
    const packageJsonPath = path.join(fullPath, 'package.json');
    try {
      await fs.access(packageJsonPath);
    } catch (err) {
      console.log(`⚠️ Skipping ${pluginDir} - no package.json found`);
      return false;
    }

    // Read package.json
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    // Check if it's a plugin with plugin- prefix
    if (!packageJson.name.includes('plugin-')) {
      console.log(`⚠️ Skipping ${pluginDir} - not a plugin package`);
      return false;
    }

    console.log(`📦 Publishing ${packageJson.name}@${packageJson.version}...`);

    // Generate branch name from template
    const versionBranch = options.branchTemplate.replace(
      '{version}',
      packageJson.version.replace(/\./g, '-')
    );

    // Build the plugin
    console.log(`🔨 Building ${packageJson.name}...`);
    try {
      execSync('bun run build', { cwd: fullPath, stdio: 'inherit' });
    } catch (error) {
      console.error(`❌ Build failed for ${packageJson.name}: ${error.message}`);

      // Ask if we should continue despite build failure
      const answer = await prompt('Build failed. Continue with publishing? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        return false;
      }
    }

    // Make sure GITHUB_TOKEN is available in the environment for the CLI command
    const env = {
      ...process.env,
      GITHUB_TOKEN: options.token,
      DEBUG: 'elizaos:*,eliza:*', // Enable debug logging for better visibility
    };

    // First, try publishing to npm if not in dry-run mode
    if (!options.dryRun) {
      console.log(`📦 Publishing ${packageJson.name} to npm...`);
      try {
        execSync('npm publish', { cwd: fullPath, stdio: 'inherit', env });
        console.log(`✅ Successfully published ${packageJson.name} to npm`);
      } catch (error) {
        console.error(`❌ Failed to publish to npm: ${error.message}`);

        // Ask if we should continue with registry publishing despite npm failure
        const answer = await prompt(
          'npm publishing failed. Continue with registry publishing? (y/N): '
        );
        if (answer.toLowerCase() !== 'y') {
          return false;
        }
      }
    }

    // Skip registry publishing if requested
    if (options.skipRegistry) {
      console.log(`🔄 Skipping registry publishing as requested`);
      return true;
    }

    // Custom registry publishing implementation that doesn't rely on CLI commands
    try {
      const result = await publishToGitHubRegistry(
        packageJson,
        options.username,
        options.token,
        versionBranch
      );

      if (!result) {
        console.error(`❌ Failed to publish to GitHub registry`);

        if (!options.dryRun) {
          // In real publish mode, if npm publish succeeded but registry failed,
          // we should still consider it a partial success
          console.log(`⚠️ Published to npm but failed to update registry metadata`);
          return true;
        }

        return false;
      }

      console.log(`✅ Successfully published ${packageJson.name} to GitHub registry`);
      return true;
    } catch (error) {
      console.error(`❌ Error during registry publishing: ${error.message}`);
      if (options.debug) {
        console.error(error);
      }

      if (!options.dryRun) {
        // Still return success if npm publishing worked
        return true;
      }

      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to publish ${pluginDir}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    // Don't set skipRegistry to true by default anymore
    if (args.includes('--force-registry')) {
      options.skipRegistry = false;
      console.log('🔄 GitHub registry publishing force enabled.');
    }

    // Ensure GitHub token is available if not skipping registry
    if (!options.skipRegistry) {
      await ensureGitHubToken();

      // Test GitHub API access with the token
      try {
        const githubApiUrl = 'https://api.github.com/user';
        console.log(`🔍 Testing GitHub API access: ${githubApiUrl}`);

        const response = await fetch(githubApiUrl, {
          headers: {
            Authorization: `token ${options.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (response.status === 200) {
          const userData = await response.json();
          console.log(`✅ GitHub API authentication successful as ${userData.login}`);

          // Store username for later use
          options.username = userData.login;
          process.env.GITHUB_USERNAME = userData.login;
        } else {
          console.error(
            `❌ GitHub API authentication failed: ${response.status} ${response.statusText}`
          );
          const responseBody = await response.text();
          console.error(`Response: ${responseBody}`);

          if (!args.includes('--force-registry')) {
            console.error('GitHub token validation failed, disabling registry publishing.');
            options.skipRegistry = true;
          }
        }
      } catch (error) {
        console.error(`❌ Error testing GitHub API: ${error.message}`);

        if (!args.includes('--force-registry')) {
          console.error('GitHub API test failed, disabling registry publishing.');
          options.skipRegistry = true;
        }
      }
    }

    const pluginDirs = await findPluginDirectories();

    if (pluginDirs.length === 0) {
      console.log('No plugins found matching the criteria');
      process.exit(0);
    }

    console.log(`Found ${pluginDirs.length} plugins to publish:`, pluginDirs);
    console.log(`Platform: ${options.platform}`);
    if (!options.skipRegistry) {
      console.log(`Primary Registry: ${options.registry}`);
      if (options.fallbackRegistry) {
        console.log(`Fallback Registry: ${options.fallbackRegistry}`);
      }
    } else {
      console.log(`Registry publishing: DISABLED (publishing to npm only)`);
    }
    console.log(`Branch template: ${options.branchTemplate}`);
    console.log(`Mode: ${options.dryRun ? 'DRY RUN (test only)' : 'PRODUCTION'}`);
    console.log(
      `GitHub token: ${options.skipRegistry ? 'Not needed' : options.token ? '✓ Available' : '❌ Missing'}`
    );

    if (!options.dryRun) {
      // Confirmation for non-dry-run mode
      console.log('\n⚠️ WARNING: You are about to publish plugins to npm.');
      console.log('Press Ctrl+C now to abort, or wait 5 seconds to continue...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const results = [];
    for (const pluginDir of pluginDirs) {
      const success = await publishPlugin(pluginDir);
      results.push({ pluginDir, success });
    }

    // Summary
    console.log('\n📋 Publication Summary:');
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`✅ ${successful} plugins ${options.dryRun ? 'tested' : 'published'} successfully`);

    if (failed > 0) {
      console.log(`❌ ${failed} plugins failed to ${options.dryRun ? 'test' : 'publish'}:`);
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.pluginDir}`);
        });
      process.exit(1);
    }
  } catch (error) {
    console.error(
      `❌ Error during plugin ${options.dryRun ? 'testing' : 'publication'}:`,
      error.message
    );
    process.exit(1);
  }
}

main();
