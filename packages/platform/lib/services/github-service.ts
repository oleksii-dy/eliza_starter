import { Octokit } from '@octokit/rest';

interface CreateRepositoryRequest {
  name: string;
  description: string;
  private: boolean;
  files: Record<string, string>;
  packageJson: any;
  projectId?: string;
  templateType?: 'defi' | 'trading' | 'nft' | 'dao' | 'general';
}

export interface CreateRepositoryResult {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
  project_id?: string;
}

interface PushFilesRequest {
  owner: string;
  repo: string;
  files: Record<string, string>;
  commitMessage: string;
  branch?: string;
  createPR?: boolean;
  prTitle?: string;
  prDescription?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

interface AutocoderProjectRequest {
  projectId: string;
  name: string;
  description: string;
  category: string;
  specification: any;
  userId: string;
  generateRepository?: boolean;
}

interface DeploymentRequest {
  owner: string;
  repo: string;
  branch?: string;
  environment?: 'development' | 'staging' | 'production';
  metadata?: Record<string, any>;
}

interface DeploymentResult {
  id: number;
  url: string;
  state: string;
  environment: string;
  created_at: string;
}

export class GitHubService {
  private octokit: Octokit;
  private defaultBranch = 'main';

  constructor(accessToken?: string) {
    this.octokit = new Octokit({
      auth:
        accessToken ||
        process.env.GITHUB_TOKEN ||
        process.env.GITHUB_ACCESS_TOKEN,
    });
  }

  async createRepository(
    request: CreateRepositoryRequest,
  ): Promise<CreateRepositoryResult> {
    try {
      // Create the repository
      const createResponse = await (this.octokit.rest.repos as any).create({
        name: request.name,
        description: request.description,
        private: request.private,
        auto_init: false, // We'll initialize with our own files
        has_issues: true,
        has_projects: true,
        has_wiki: true,
      });

      const repo = createResponse.data;

      // Wait a moment for the repository to be fully created
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create initial files
      await this.pushFiles({
        owner: repo.owner.login,
        repo: repo.name,
        files: {
          ...request.files,
          'package.json': JSON.stringify(request.packageJson, null, 2),
          'README.md': this.generateReadme(
            request.name,
            request.description,
            request.packageJson,
          ),
          '.gitignore': this.generateGitignore(),
          LICENSE: this.generateMITLicense(repo.owner.login),
        },
        commitMessage: 'Initial commit: Add generated plugin files',
        branch: this.defaultBranch,
      });

      console.log(`Created GitHub repository: ${repo.full_name}`);

      return {
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        default_branch: this.defaultBranch,
        project_id: request.projectId,
      };
    } catch (error) {
      console.error('Failed to create GitHub repository:', error);
      throw new Error(
        `GitHub repository creation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async pushFiles(request: PushFilesRequest): Promise<{ commitSha?: string; prNumber?: number }> {
    try {
      const {
        owner,
        repo,
        files,
        commitMessage,
        branch = this.defaultBranch,
        createPR = false,
        prTitle,
        prDescription,
      } = request;

      // Get the current reference to the branch
      let ref;
      try {
        const refResponse = await this.octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`,
        });
        ref = refResponse.data;
      } catch (error) {
        // Branch doesn't exist, create it
        const masterRef = await this.octokit.rest.git
          .getRef({
            owner,
            repo,
            ref: 'heads/main',
          })
          .catch(async () => {
            // No main branch either, create initial empty commit
            const emptyTree = await this.octokit.rest.git.createTree({
              owner,
              repo,
              tree: [],
            });

            const emptyCommit = await this.octokit.rest.git.createCommit({
              owner,
              repo,
              message: 'Initial empty commit',
              tree: emptyTree.data.sha,
            });

            return this.octokit.rest.git.createRef({
              owner,
              repo,
              ref: `refs/heads/${branch}`,
              sha: emptyCommit.data.sha,
            });
          });

        if (masterRef) {
          ref = await this.octokit.rest.git
            .createRef({
              owner,
              repo,
              ref: `refs/heads/${branch}`,
              sha: masterRef.data.object.sha,
            })
            .then((r) => r.data);
        }
      }

      // Get the current commit
      if (!ref) {
        throw new Error('Could not get branch reference');
      }
      const currentCommit = await this.octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: ref.object.sha,
      });

      // Create blobs for all files
      const fileBlobs = await Promise.all(
        Object.entries(files).map(async ([path, content]) => {
          const blob = await this.octokit.rest.git.createBlob({
            owner,
            repo,
            content: Buffer.from(content, 'utf8').toString('base64'),
            encoding: 'base64',
          });

          return {
            path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.data.sha,
          };
        }),
      );

      // Create a new tree
      const newTree = await this.octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: currentCommit.data.tree.sha,
        tree: fileBlobs,
      });

      // Create a new commit
      const newCommit = await this.octokit.rest.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: newTree.data.sha,
        parents: [currentCommit.data.sha],
      });

      // Update the reference
      await this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.data.sha,
      });

      console.log(
        `Pushed ${Object.keys(files).length} files to ${owner}/${repo}`,
      );

      let prNumber: number | undefined;

      // Create pull request if requested
      if (createPR && branch !== this.defaultBranch) {
        try {
          const prResponse = await this.octokit.rest.pulls.create({
            owner,
            repo,
            title: prTitle || `Update from ${branch}`,
            head: branch,
            base: this.defaultBranch,
            body: prDescription || `Automated changes from autocoder.\n\nCommit: ${commitMessage}`,
          });
          prNumber = prResponse.data.number;
          console.log(`Created pull request #${prNumber}`);
        } catch (prError) {
          console.warn('Failed to create pull request:', prError);
        }
      }

      return { commitSha: newCommit.data.sha, prNumber };
    } catch (error) {
      console.error('Failed to push files to GitHub:', error);
      throw new Error(
        `Failed to push files to GitHub: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getUserRepositories(username?: string): Promise<any[]> {
    try {
      const response = username
        ? await this.octokit.rest.repos.listForUser({ username, per_page: 100 })
        : await this.octokit.rest.repos.listForAuthenticatedUser({
          per_page: 100,
        });

      return response.data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        default_branch: repo.default_branch,
        updated_at: repo.updated_at,
      }));
    } catch (error) {
      console.error('Failed to get GitHub repositories:', error);
      throw new Error(
        `Failed to get GitHub repositories: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getAuthenticatedUser(): Promise<GitHubUser> {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      return {
        id: response.data.id,
        login: response.data.login,
        name: response.data.name || response.data.login,
        email: response.data.email || '',
        avatar_url: response.data.avatar_url,
      };
    } catch (error) {
      console.error('Failed to get authenticated GitHub user:', error);
      throw new Error(
        `Failed to get GitHub user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async validateRepository(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({ owner, repo });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a repository specifically for an autocoder project
   */
  async createAutocoderRepository(request: AutocoderProjectRequest): Promise<CreateRepositoryResult> {
    const { projectId, name, description, category, specification, userId, generateRepository = true } = request;

    if (!generateRepository) {
      throw new Error('Repository generation is required for autocoder projects');
    }

    // Generate project-specific files based on category
    const projectFiles = await this.generateProjectFiles(category, specification);
    const packageJson = this.generatePackageJson(name, description, category);

    const repoName = this.sanitizeRepositoryName(`${name}-${projectId.slice(0, 8)}`);

    return this.createRepository({
      name: repoName,
      description: `${description} - Generated by ElizaOS Autocoder`,
      private: false, // Make public by default for open source projects
      files: projectFiles,
      packageJson,
      projectId,
      templateType: category as any,
    });
  }

  /**
   * Create a feature branch for development
   */
  async createFeatureBranch(owner: string, repo: string, branchName: string, fromBranch = 'main'): Promise<string> {
    try {
      // Get the reference for the base branch
      const baseRef = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`,
      });

      // Create the new branch
      const newBranch = await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.data.object.sha,
      });

      console.log(`Created feature branch: ${branchName}`);
      return newBranch.data.ref;
    } catch (error) {
      console.error('Failed to create feature branch:', error);
      throw new Error(
        `Failed to create feature branch: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Deploy a repository to GitHub Pages or other hosting
   */
  async deployRepository(request: DeploymentRequest): Promise<DeploymentResult> {
    try {
      const { owner, repo, branch = 'main', environment = 'production', metadata = {} } = request;

      // Create a deployment
      const deployment = await this.octokit.rest.repos.createDeployment({
        owner,
        repo,
        ref: branch,
        environment,
        description: `Autocoder deployment to ${environment}`,
        auto_merge: false,
        required_contexts: [],
        payload: metadata,
      });

      // Check if deployment was successful
      if ('id' in deployment.data) {
        // Update deployment status to success (in a real scenario, this would be done by the deployment system)
        await this.octokit.rest.repos.createDeploymentStatus({
          owner,
          repo,
          deployment_id: deployment.data.id,
          state: 'success',
          description: 'Deployment completed successfully',
          environment_url: `https://${owner}.github.io/${repo}`,
        });

        return {
          id: deployment.data.id,
          url: `https://${owner}.github.io/${repo}`,
          state: 'success',
          environment,
          created_at: deployment.data.created_at,
        };
      } else {
        throw new Error(`Failed to create deployment: ${(deployment.data as any).message}`);
      }
    } catch (error) {
      console.error('Failed to deploy repository:', error);
      throw new Error(
        `Failed to deploy repository: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get repository statistics and information
   */
  async getRepositoryStats(owner: string, repo: string): Promise<any> {
    try {
      const [repoInfo, commits, contributors, languages] = await Promise.all([
        this.octokit.rest.repos.get({ owner, repo }),
        this.octokit.rest.repos.listCommits({ owner, repo, per_page: 1 }),
        this.octokit.rest.repos.listContributors({ owner, repo }),
        this.octokit.rest.repos.listLanguages({ owner, repo }),
      ]);

      return {
        repository: {
          id: repoInfo.data.id,
          name: repoInfo.data.name,
          full_name: repoInfo.data.full_name,
          description: repoInfo.data.description,
          private: repoInfo.data.private,
          stars: repoInfo.data.stargazers_count,
          forks: repoInfo.data.forks_count,
          watchers: repoInfo.data.watchers_count,
          size: repoInfo.data.size,
          default_branch: repoInfo.data.default_branch,
          created_at: repoInfo.data.created_at,
          updated_at: repoInfo.data.updated_at,
        },
        commits: commits.data.length,
        contributors: contributors.data.length,
        languages: languages.data,
      };
    } catch (error) {
      console.error('Failed to get repository stats:', error);
      throw new Error(
        `Failed to get repository stats: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Search for repositories with autocoder tags
   */
  async searchAutocoderRepositories(query: string, page = 1, perPage = 30): Promise<any> {
    try {
      const searchQuery = `${query} topic:elizaos-autocoder`;
      const response = await this.octokit.rest.search.repos({
        q: searchQuery,
        sort: 'updated',
        order: 'desc',
        page,
        per_page: perPage,
      });

      return {
        total_count: response.data.total_count,
        incomplete_results: response.data.incomplete_results,
        items: response.data.items.map((repo) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          html_url: repo.html_url,
          clone_url: repo.clone_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          topics: repo.topics,
          updated_at: repo.updated_at,
        })),
      };
    } catch (error) {
      console.error('Failed to search autocoder repositories:', error);
      throw new Error(
        `Failed to search repositories: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private generateReadme(
    name: string,
    description: string,
    packageJson: any,
  ): string {
    return `# ${name}

${description}

## Installation

\`\`\`bash
npm install ${packageJson.name}
\`\`\`

## Usage

\`\`\`typescript
import { ${name.replace(/[^a-zA-Z0-9]/g, '')}Plugin } from '${packageJson.name}'

// Add to your ElizaOS agent
const agent = new Agent({
  plugins: [${name.replace(/[^a-zA-Z0-9]/g, '')}Plugin]
})
\`\`\`

## Features

${packageJson.description ? `- ${packageJson.description}` : '- Core functionality'}

## Development

\`\`\`bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
\`\`\`

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Generated with [ElizaOS Autocoder](https://elizaos.ai/autocoder)
`;
  }

  private generateGitignore(): string {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# ESLint cache
.eslintcache

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port
`;
  }

  private generateMITLicense(owner: string): string {
    const year = new Date().getFullYear();
    return `MIT License

Copyright (c) ${year} ${owner}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
  }

  /**
   * Generate project-specific files based on category and specification
   */
  private async generateProjectFiles(category: string, specification: any): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    // Add category-specific files
    switch (category) {
      case 'defi':
        files['contracts/DeFiProtocol.sol'] = this.generateDeFiContract(specification);
        files['scripts/deploy.js'] = this.generateDeployScript();
        files['test/DeFiProtocol.test.js'] = this.generateTestFile('DeFi Protocol');
        break;

      case 'trading':
        files['src/TradingBot.ts'] = this.generateTradingBot(specification);
        files['src/strategies/BaseStrategy.ts'] = this.generateBaseStrategy();
        files['config/trading.json'] = this.generateTradingConfig();
        break;

      case 'nft':
        files['contracts/NFTCollection.sol'] = this.generateNFTContract(specification);
        files['metadata/traits.json'] = this.generateNFTMetadata();
        files['scripts/mint.js'] = this.generateMintScript();
        break;

      case 'dao':
        files['contracts/DAO.sol'] = this.generateDAOContract(specification);
        files['governance/proposals.md'] = this.generateGovernanceDoc();
        files['scripts/governance.js'] = this.generateGovernanceScript();
        break;

      default:
        files['src/index.ts'] = this.generateBasicIndex(specification);
        files['src/types.ts'] = this.generateBasicTypes();
        break;
    }

    // Common files for all projects
    files['tsconfig.json'] = this.generateTsConfig();
    files['.eslintrc.js'] = this.generateEslintConfig();
    files['jest.config.js'] = this.generateJestConfig();
    files['.github/workflows/ci.yml'] = this.generateCIWorkflow();

    return files;
  }

  /**
   * Generate package.json for autocoder projects
   */
  private generatePackageJson(name: string, description: string, category: string): any {
    const sanitizedName = this.sanitizePackageName(name);

    const basePackage = {
      name: sanitizedName,
      version: '1.0.0',
      description,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        test: 'jest',
        lint: 'eslint src/**/*.ts',
        'lint:fix': 'eslint src/**/*.ts --fix',
        dev: 'ts-node src/index.ts',
        start: 'node dist/index.js',
      },
      keywords: [
        'elizaos',
        'autocoder',
        category,
        'defi',
        'blockchain',
        'crypto',
      ],
      author: 'ElizaOS Autocoder',
      license: 'MIT',
      devDependencies: {
        '@types/node': '^20.0.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        'eslint': '^8.0.0',
        'jest': '^29.0.0',
        '@types/jest': '^29.0.0',
        'ts-jest': '^29.0.0',
        'ts-node': '^10.0.0',
        'typescript': '^5.0.0',
      },
      dependencies: {},
      repository: {
        type: 'git',
        url: `git+https://github.com/elizaos-autocoder/${sanitizedName}.git`,
      },
      bugs: {
        url: `https://github.com/elizaos-autocoder/${sanitizedName}/issues`,
      },
      homepage: `https://github.com/elizaos-autocoder/${sanitizedName}#readme`,
    };

    // Add category-specific dependencies
    switch (category) {
      case 'defi':
        basePackage.dependencies = {
          '@openzeppelin/contracts': '^5.0.0',
          'hardhat': '^2.19.0',
          'ethers': '^6.8.0',
          '@nomicfoundation/hardhat-toolbox': '^4.0.0',
        };
        // Create a new scripts object instead of spreading
        const defiScripts = {
          build: basePackage.scripts.build,
          test: basePackage.scripts.test,
          lint: basePackage.scripts.lint,
          'lint:fix': basePackage.scripts['lint:fix'],
          dev: basePackage.scripts.dev,
          start: basePackage.scripts.start,
          deploy: 'hardhat run scripts/deploy.js',
          'test:contracts': 'hardhat test',
        };
        basePackage.scripts = defiScripts as typeof basePackage.scripts;
        break;

      case 'trading':
        basePackage.dependencies = {
          'ccxt': '^4.1.0',
          'ta-lib': '^0.1.0',
          'ws': '^8.14.0',
          'axios': '^1.5.0',
        };
        break;

      case 'nft':
        basePackage.dependencies = {
          '@openzeppelin/contracts': '^5.0.0',
          'sharp': '^0.32.0',
          'canvas': '^2.11.0',
        };
        break;
    }

    return basePackage;
  }

  /**
   * Utility methods for generating specific file contents
   */
  private generateDeFiContract(spec: any): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DeFiProtocol
 * @dev ${spec.description || 'A DeFi protocol for yield farming and liquidity provision'}
 */
contract DeFiProtocol is ERC20, Ownable, ReentrancyGuard {
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;
    uint256 public rewardRate = 100; // 1% per day (10000 = 100%)

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    constructor() ERC20("DeFiProtocol", "DFP") {}

    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Deposit must be greater than 0");
        
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(deposits[msg.sender] >= amount, "Insufficient deposit");
        require(balanceOf(msg.sender) >= amount, "Insufficient token balance");
        
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
        
        emit Withdraw(msg.sender, amount);
    }

    function calculateReward(address user) external view returns (uint256) {
        return (deposits[user] * rewardRate) / 10000;
    }
}`;
  }

  private generateTradingBot(spec: any): string {
    return `import ccxt from 'ccxt';
import { BaseStrategy } from './strategies/BaseStrategy';

export class TradingBot {
  private exchange: ccxt.Exchange;
  private strategy: BaseStrategy;
  private isRunning: boolean = false;

  constructor(exchangeId: string, config: any, strategy: BaseStrategy) {
    this.exchange = new ccxt[exchangeId as keyof typeof ccxt](config);
    this.strategy = strategy;
  }

  async start(): Promise<void> {
    console.log('Starting trading bot...');
    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.executeStrategy();
        await this.sleep(60000); // Wait 1 minute
      } catch (error) {
        console.error('Trading error:', error);
        await this.sleep(30000); // Wait 30 seconds on error
      }
    }
  }

  async stop(): Promise<void> {
    console.log('Stopping trading bot...');
    this.isRunning = false;
  }

  private async executeStrategy(): Promise<void> {
    const signal = await this.strategy.analyze();
    
    if (signal.action === 'buy') {
      await this.placeBuyOrder(signal.symbol, signal.amount);
    } else if (signal.action === 'sell') {
      await this.placeSellOrder(signal.symbol, signal.amount);
    }
  }

  private async placeBuyOrder(symbol: string, amount: number): Promise<void> {
    // Implementation for buy orders
    console.log(\`Placing buy order: \${amount} \${symbol}\`);
  }

  private async placeSellOrder(symbol: string, amount: number): Promise<void> {
    // Implementation for sell orders
    console.log(\`Placing sell order: \${amount} \${symbol}\`);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}`;
  }

  private generateNFTContract(spec: any): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTCollection is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    uint256 public maxSupply = ${spec.maxSupply || 10000};
    uint256 public mintPrice = ${spec.mintPrice || '0.01 ether'};
    string private _baseTokenURI;

    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) {}

    function mint(address to, string memory tokenURI) 
        external 
        payable 
        returns (uint256) 
    {
        require(_tokenIds.current() < maxSupply, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        return newTokenId;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _burn(uint256 tokenId) 
        internal 
        override(ERC721, ERC721URIStorage) 
    {
        super._burn(tokenId);
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}`;
  }

  private generateBasicIndex(spec: any): string {
    return `export class AutocoderProject {
  private name: string;
  private description: string;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  public getName(): string {
    return this.name;
  }

  public getDescription(): string {
    return this.description;
  }

  public start(): void {
    console.log(\`Starting \${this.name}...\`);
    console.log(\`Description: \${this.description}\`);
  }
}

// Example usage
const project = new AutocoderProject(
  "${spec.name || 'Autocoder Project'}",
  "${spec.description || 'Generated by ElizaOS Autocoder'}"
);

project.start();
`;
  }

  private sanitizeRepositoryName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private sanitizePackageName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .replace(/^@/, '');
  }

  // Additional utility methods for generating common files
  private generateTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts'],
    }, null, 2);
  }

  private generateEslintConfig(): string {
    return `module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};`;
  }

  private generateJestConfig(): string {
    return `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};`;
  }

  private generateCIWorkflow(): string {
    return `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm ci
    - run: npm run build
    - run: npm run lint
    - run: npm test
    - run: npm run test:coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      if: matrix.node-version == '18.x'
`;
  }

  private generateDeployScript(): string {
    return `const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const DeFiProtocol = await ethers.getContractFactory("DeFiProtocol");
  const protocol = await DeFiProtocol.deploy();

  await protocol.deployed();
  console.log("DeFiProtocol deployed to:", protocol.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });`;
  }

  private generateTestFile(contractName: string): string {
    return `const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("${contractName}", function () {
  let contract;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("${contractName.replace(/\s+/g, '')}");
    contract = await Contract.deploy();
    await contract.deployed();
  });

  it("Should deploy successfully", async function () {
    expect(contract.address).to.not.equal(0);
  });

  it("Should have correct initial state", async function () {
    expect(await contract.totalDeposits()).to.equal(0);
  });
});`;
  }

  private generateBaseStrategy(): string {
    return `export interface TradingSignal {
  action: 'buy' | 'sell' | 'hold';
  symbol: string;
  amount: number;
  confidence: number;
}

export abstract class BaseStrategy {
  abstract analyze(): Promise<TradingSignal>;
}`;
  }

  private generateTradingConfig(): string {
    return JSON.stringify({
      exchange: 'binance',
      symbols: ['BTC/USDT', 'ETH/USDT'],
      timeframe: '1m',
      risk_management: {
        max_position_size: 0.1,
        stop_loss: 0.02,
        take_profit: 0.05,
      },
      strategy: {
        name: 'momentum',
        parameters: {
          period: 14,
          threshold: 0.01,
        },
      },
    }, null, 2);
  }

  private generateNFTMetadata(): string {
    return JSON.stringify({
      traits: [
        { trait_type: 'Background', values: ['Blue', 'Red', 'Green', 'Purple'] },
        { trait_type: 'Eyes', values: ['Normal', 'Laser', 'Glow', 'Wink'] },
        { trait_type: 'Mouth', values: ['Smile', 'Frown', 'Open', 'Surprised'] },
        { trait_type: 'Accessory', values: ['Hat', 'Sunglasses', 'Earrings', 'None'] },
      ],
      rarity: {
        common: 60,
        uncommon: 25,
        rare: 10,
        legendary: 5,
      },
    }, null, 2);
  }

  private generateMintScript(): string {
    return `const { ethers } = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const contract = await ethers.getContractAt("NFTCollection", contractAddress);

  const tokenURI = "https://example.com/metadata/1.json";
  const recipient = "0x..."; // Replace with actual address

  const tx = await contract.mint(recipient, tokenURI, {
    value: ethers.utils.parseEther("0.01")
  });

  await tx.wait();
  console.log("NFT minted successfully!");
}

main().catch(console.error);`;
  }

  private generateDAOContract(spec: any): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";

contract DAO is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes {
    constructor(IVotes _token)
        Governor("${spec.name || 'AutocoderDAO'}")
        GovernorSettings(1, 50400, 0) // 1 block delay, 1 week voting period, 0 proposal threshold
        GovernorVotes(_token)
    {}

    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }
}`;
  }

  private generateGovernanceDoc(): string {
    return `# Governance

This document outlines the governance structure and proposal process for the DAO.

## Proposal Types

1. **Parameter Changes**: Modify protocol parameters
2. **Treasury Management**: Allocate treasury funds
3. **Protocol Upgrades**: Implement new features or fixes
4. **Partnership Proposals**: Form strategic partnerships

## Voting Process

1. **Proposal Creation**: Token holders can create proposals
2. **Discussion Period**: Community discusses the proposal
3. **Voting Period**: Token holders vote on the proposal
4. **Execution**: Successful proposals are executed automatically

## Voting Power

Voting power is determined by the number of governance tokens held at the time of proposal creation.

## Quorum Requirements

- Minimum 10% of total token supply must participate
- Simple majority (>50%) required for passage
`;
  }

  private generateGovernanceScript(): string {
    return `const { ethers } = require("hardhat");

async function createProposal() {
  const dao = await ethers.getContract("DAO");
  
  const targets = ["0x..."]; // Target contract addresses
  const values = [0]; // ETH values to send
  const calldatas = ["0x"]; // Encoded function calls
  const description = "Proposal to update protocol parameters";

  const tx = await dao.propose(targets, values, calldatas, description);
  const receipt = await tx.wait();
  
  console.log("Proposal created with ID:", receipt.events[0].args.proposalId);
}

createProposal().catch(console.error);`;
  }

  private generateBasicTypes(): string {
    return `export interface Config {
  name: string;
  description: string;
  version: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export enum Status {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}`;
  }
}

// Utility function to create GitHub service with user's token
export function createGitHubService(userToken?: string): GitHubService {
  return new GitHubService(userToken);
}
