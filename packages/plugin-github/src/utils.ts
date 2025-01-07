import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { existsSync } from "fs";
import simpleGit, { CommitResult } from "simple-git";
import { Octokit } from "@octokit/rest";
import {
    elizaLogger,
    getEmbeddingZeroVector,
    IAgentRuntime,
    Memory,
    State,
    stringToUuid,
    UUID,
} from "@elizaos/core";
import { RestEndpointMethodTypes } from "@octokit/rest";
import { contextTemplate } from "./templates";
import { GitHubService } from "./services/github";

export function getRepoPath(owner: string, repo: string) {
    return path.join("/tmp", "elizaos-repos", owner, repo);
}

export async function createReposDirectory(owner: string) {
    const dirPath = path.join("/tmp", "elizaos-repos", owner);
    if (existsSync(dirPath)) {
        elizaLogger.info(`Repos directory already exists: ${dirPath}`);
        return;
    }
    try {
        // Create repos directory
        await fs.mkdir(dirPath, {
            recursive: true,
        });
    } catch (error) {
        elizaLogger.error("Error creating repos directory:", error);
        throw new Error(`Error creating repos directory: ${error}`);
    }
}

export async function cloneOrPullRepository(
    owner: string,
    repo: string,
    repoPath: string,
    branch: string = "main"
) {
    try {
        elizaLogger.info(
            `Cloning or pulling repository ${owner}/${repo}... @ branch: ${branch}`
        );
        elizaLogger.info(
            `URL: https://github.com/${owner}/${repo}.git @ branch: ${branch}`
        );

        // Clone or pull repository
        if (!existsSync(repoPath)) {
            const git = simpleGit();
            await git.clone(
                `https://github.com/${owner}/${repo}.git`,
                repoPath,
                {
                    "--branch": branch,
                }
            );
        } else {
            const git = simpleGit(repoPath);
            await git.pull();
        }
    } catch (error) {
        elizaLogger.error(
            `Error cloning or pulling repository ${owner}/${repo}:`,
            error
        );
        throw new Error(`Error cloning or pulling repository: ${error}`);
    }
}

export async function writeFiles(
    repoPath: string,
    files: Array<{ path: string; content: string }>
) {
    try {
        // check if the local repo exists
        if (!existsSync(repoPath)) {
            elizaLogger.error(
                `Repository ${repoPath} does not exist locally. Please initialize the repository first.`
            );
            throw new Error(
                `Repository ${repoPath} does not exist locally. Please initialize the repository first.`
            );
        }

        for (const file of files) {
            const filePath = path.join(repoPath, file.path);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, file.content);
        }
    } catch (error) {
        elizaLogger.error("Error writing files:", error);
        throw new Error(`Error writing files: ${error}`);
    }
}

export async function commitAndPushChanges(
    repoPath: string,
    message: string,
    branch?: string
): Promise<CommitResult> {
    try {
        const git = simpleGit(repoPath);
        await git.add(".");
        const commit = await git.commit(message);
        let pushResult;
        if (branch) {
            pushResult = await git.push("origin", branch);
        } else {
            pushResult = await git.push();
        }
        elizaLogger.info("Push result:", pushResult);
        return commit;
    } catch (error) {
        elizaLogger.error("Error committing and pushing changes:", error);
        throw new Error(`Error committing and pushing changes: ${error}`);
    }
}

export async function checkoutBranch(
    repoPath: string,
    branch?: string,
    create: boolean = false
) {
    if (!branch) {
        return;
    }

    elizaLogger.info(`Checking out branch ${branch} in repository ${repoPath}`);

    try {
        const git = simpleGit(repoPath);

        // Get the list of branches
        const branchList = await git.branch();

        // Check if the branch exists
        const branchExists = branchList.all.includes(branch);

        if (create) {
            if (branchExists) {
                elizaLogger.warn(
                    `Branch "${branch}" already exists. Checking out instead.`
                );
                await git.checkout(branch); // Checkout the existing branch
            } else {
                // Create a new branch
                await git.checkoutLocalBranch(branch);
            }
        } else {
            if (!branchExists) {
                throw new Error(`Branch "${branch}" does not exist.`);
            }
            // Checkout an existing branch
            await git.checkout(branch);
        }
    } catch (error) {
        elizaLogger.error("Error checking out branch:", error.message);
        throw new Error(`Error checking out branch: ${error.message}`);
    }
}

export async function createPullRequest(
    token: string,
    owner: string,
    repo: string,
    branch: string,
    title: string,
    description?: string,
    base?: string
): Promise<RestEndpointMethodTypes["pulls"]["create"]["response"]["data"]> {
    try {
        const octokit = new Octokit({
            auth: token,
        });

        const pr = await octokit.pulls.create({
            owner,
            repo,
            title,
            body: description || title,
            head: branch,
            base: base || "develop",
        });
        return pr.data;
    } catch (error) {
        elizaLogger.error("Error creating pull request:", error);
        throw new Error(`Error creating pull request: ${error}`);
    }
}

export async function retrieveFiles(repoPath: string, gitPath: string) {
    // Build the search path
    const searchPath = gitPath
        ? path.join(repoPath, gitPath, "**/*")
        : path.join(repoPath, "**/*");
    elizaLogger.info(`Repo path: ${repoPath}`);
    elizaLogger.info(`Search path: ${searchPath}`);
    // Exclude `.git` directory and test files
    const ignorePatterns = [
        "**/.git/**",
        "**/.gitignore",
        "**/.github/**",
        "**/.env",
        "**/.env.local",
        "**/.env.*.local",
        "**/.vscode/**",
        "**/.idea/**",
        "**/.idea_modules/**",
        "**/.code-workspace",
        "test/**/*",
        "tests/**/*",
        "**/test/**/*",
        "**/tests/**/*",
        "**/*.test.*",
        "**/*.spec.*",
        "**/.DS_Store",
        "LICENSE",
        "CONTRIBUTING.md",
        "CODE_OF_CONDUCT.md",
    ];

    // Check if a .gitignore file exists
    const gitignorePath = path.join(repoPath, ".gitignore");
    if (existsSync(gitignorePath)) {
        const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
        const gitignoreLines = gitignoreContent
            .split("\n")
            .map((line) => line.trim())
            .filter(
                (line) => line && !line.startsWith("#") && !line.startsWith("!")
            ) // Exclude comments and lines starting with '!'
            .map((line) => `**/${line}`); // Convert to glob patterns

        ignorePatterns.push(...gitignoreLines);
    }

    elizaLogger.info(`Ignore patterns:\n${ignorePatterns.join("\n")}`);

    const files = await glob(searchPath, {
        nodir: true,
        dot: true, // Include dotfiles
        ignore: ignorePatterns, // Exclude .git, test files and .gitignore patterns
    });

    elizaLogger.info(`Retrieved Files:\n${files.join("\n")}`);

    return files;
}

export const getFilesFromMemories = async (
    runtime: IAgentRuntime,
    message: Memory
) => {
    const allMemories = await runtime.messageManager.getMemories({
        roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    });
    // elizaLogger.info("All Memories:", allMemories);
    const memories = [
        {
            id: "df07d47c-b599-001b-a67a-223a7e14aef6",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import { defineConfig } from "tsup";\\n\\nexport default defineConfig({\\n    entry: ["src/index.ts"],\\n    outDir: "dist",\\n    sourcemap: true,\\n    clean: true,\\n    format: ["cjs", "esm"],\\n    dts: true,\\n    splitting: false,\\n    bundle: true,\\n    minify: false,\\n    external: [\\n        "@coinbase/coinbase-sdk",\\n        "form-data",\\n        "combined-stream",\\n        "axios",\\n        "util",\\n        "stream",\\n        "http",\\n        "https",\\n        "events",\\n        "crypto",\\n        "buffer",\\n        "url",\\n        "zlib",\\n        "querystring",\\n        "os",\\n        "@reflink/reflink",\\n        "@node-llama-cpp",\\n        "agentkeepalive",\\n        "fs/promises",\\n        "csv-writer",\\n        "csv-parse/sync",\\n        "dotenv",\\n        "coinbase-advanced-sdk",\\n        "advanced-sdk-ts",\\n        "jsonwebtoken",\\n        "whatwg-url"\\n    ],\\n    platform: \'node\',\\n    target: \'node18\',\\n    esbuildOptions(options) {\\n        options.bundle = true;\\n        options.platform = \'node\';\\n        options.target = \'node18\';\\n    }\\n});\\n',
                hash: "513d5ec447a0187702e22dc62c76c5685806dc1504b947f4a419c90d7f48f11b",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/tsup.config.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "1afc74a9-b1f4-0267-994a-f2d9df59c44e",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: '{\\n    "extends": "../core/tsconfig.json",\\n    "compilerOptions": {\\n        "outDir": "dist",\\n        "rootDir": ".",\\n        "rootDirs": [\\n            "src",\\n            "advanced-sdk-ts"\\n        ],\\n        "types": [\\n            "node"\\n        ]\\n    },\\n    "include": [\\n        "src/**/*.ts",\\n        "advanced-sdk-ts/src/**/*.ts",\\n    ]\\n}',
                hash: "8c1ba3bea7975a73c5782562a36b00cd677b5774712d741c7b2631e4d9b275db",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/tsconfig.json",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "571315fa-1dc1-000d-b22f-628336066f18",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: '{\\n  "name": "@elizaos/plugin-coinbase",\\n  "version": "0.1.7-alpha.2",\\n  "main": "dist/index.js",\\n  "type": "module",\\n  "types": "dist/index.d.ts",\\n  "dependencies": {\\n    "@elizaos/core": "workspace:*",\\n    "coinbase-api": "1.0.5",\\n    "coinbase-advanced-sdk": "file:../../packages/plugin-coinbase/advanced-sdk-ts",\\n    "jsonwebtoken": "^9.0.2",\\n    "@types/jsonwebtoken": "^9.0.7",\\n    "node-fetch": "^2.6.1"\\n  },\\n  "devDependencies": {\\n    "tsup": "8.3.5",\\n    "@types/node": "^20.0.0"\\n  },\\n  "scripts": {\\n    "build": "tsup --format esm --dts",\\n    "dev": "tsup --format esm --dts --watch",\\n    "lint": "eslint --fix  --cache ."\\n  }\\n}\\n',
                hash: "064c499413efe81d18a9746a57d88ba6b772a3fa4af69b2aa74bb6ab55653895",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/package.json",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "0bf96159-e058-0125-a3d1-740623711192",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import eslintGlobalConfig from "../../eslint.config.mjs";\\n\\nexport default [...eslintGlobalConfig];\\n',
                hash: "03915a4e33818f479148de66fd456a7940388b5dcce381a9b2d40eb7b569e467",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/eslint.config.mjs",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "d9bedcef-b079-076b-a0cb-484ea3f06111",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "# @elizaos/plugin-coinbase\\n\\nA comprehensive Coinbase integration plugin for ElizaOS that provides access to Coinbase's various APIs and services.\\n\\n## Features\\n\\n- **Commerce Integration**: Create and manage payment charges using Coinbase Commerce\\n- **Trading**: Execute trades and swaps between different assets\\n- **Token Contract Management**: Deploy and interact with ERC20, ERC721, and ERC1155 smart contracts\\n- **Mass Payments**: Process bulk transfers and payments to multiple addresses\\n- **Advanced Trading**: Access to Coinbase Advanced Trading API features\\n- **Webhook Management**: Create and manage webhooks for various blockchain events\\n\\n## Installation\\n\\n```bash\\nnpm install @elizaos/plugin-coinbase\\n```\\n\\n## Configuration\\n\\nThe plugin requires several environment variables to be set:\\n\\n```env\\nCOINBASE_API_KEY=your_api_key\\nCOINBASE_PRIVATE_KEY=your_private_key\\nCOINBASE_COMMERCE_KEY=your_commerce_key\\nCOINBASE_NOTIFICATION_URI=your_webhook_notification_uri\\n```\\n\\n## Usage\\n\\n```typescript\\nimport { plugins } from '@elizaos/plugin-coinbase';\\n\\n// Register all plugins\\nconst {\\n  coinbaseMassPaymentsPlugin,\\n  coinbaseCommercePlugin,\\n  tradePlugin,\\n  tokenContractPlugin,\\n  webhookPlugin,\\n  advancedTradePlugin\\n} = plugins;\\n\\n// Register individual plugins as needed\\nruntime.registerPlugin(coinbaseCommercePlugin);\\nruntime.registerPlugin(tradePlugin);\\n// etc...\\n```\\n\\n## Available Plugins\\n\\n### Commerce Plugin\\n- Create charges with fixed or dynamic pricing\\n- Support for multiple currencies (USD, EUR, USDC)\\n- Charge status tracking and management\\n\\n### Trade Plugin\\n- Execute basic trades between assets\\n- Support for market and limit orders\\n- Transaction logging and tracking\\n\\n### Token Contract Plugin\\n- Deploy ERC20, ERC721, and ERC1155 contracts\\n- Interact with deployed contracts\\n- Read contract data and balances\\n\\n### Mass Payments Plugin\\n- Process bulk transfers to multiple addresses\\n- Support for various assets and networks\\n- Transaction logging and CSV export\\n\\n### Advanced Trade Plugin\\n- Access to advanced trading features\\n- Support for complex order types\\n- Detailed trade history and tracking\\n\\n### Webhook Plugin\\n- Create and manage blockchain event webhooks\\n- Support for various event types and filters\\n- Webhook status tracking and logging\\n\\n## Supported Networks\\n\\n- Base (Mainnet & Sepolia)\\n- Ethereum (Mainnet & Holesky)\\n- Polygon Mainnet\\n- Solana (Mainnet & Devnet)\\n- Arbitrum Mainnet\\n- And more...\\n\\n## CSV Logging\\n\\nThe plugin automatically logs various operations to CSV files:\\n- `trades.csv`: Trading operations\\n- `transactions.csv`: Mass payment transactions\\n- `webhooks.csv`: Webhook configurations\\n- `advanced_trades.csv`: Advanced trading operations\\n\\n## Dependencies\\n\\n- `@elizaos/core`: Core ElizaOS functionality\\n- `coinbase-api`: Coinbase API integration\\n- `coinbase-advanced-sdk`: Coinbase Advanced Trading SDK\\n- Additional type definitions and utilities\\n\\n## Future Enhancements\\n\\n1. **Advanced Trading Features**\\n   - Real-time market data streaming\\n   - Advanced order types (OCO, trailing stop)\\n   - Portfolio rebalancing automation\\n   - Custom trading strategies implementation\\n   - Multi-exchange arbitrage support\\n\\n2. **Enhanced Commerce Integration**\\n   - Subscription payment handling\\n   - Multi-currency checkout optimization\\n   - Advanced refund management\\n   - Custom payment flow templates\\n   - Automated invoice generation\\n\\n3. **Improved Token Management**\\n   - Batch token operations\\n   - Gas optimization for token contracts\\n   - Token metadata management system\\n   - Automated token listing process\\n   - Smart contract deployment templates\\n\\n4. **Security Enhancements**\\n   - Advanced API key management\\n   - Multi-signature support\\n   - Transaction monitoring system\\n   - Risk assessment tools\\n   - Rate limiting improvements\\n\\n5. **Analytics and Reporting**\\n   - Custom report generation\\n   - Trading performance analytics\\n   - Payment flow analytics\\n   - Real-time monitoring dashboard\\n   - Historical data analysis tools\\n\\n6. **Webhook Management**\\n   - Enhanced event filtering\\n   - Retry mechanism improvements\\n   - Webhook monitoring dashboard\\n   - Custom webhook templates\\n   - Event batching support\\n\\n7. **Developer Tools**\\n   - SDK expansion\\n   - Testing environment improvements\\n   - Documentation generator\\n   - CLI tools for common operations\\n   - Integration templates\\n\\n8. **Cross-Platform Integration**\\n   - Mobile SDK support\\n   - Browser extension support\\n   - Desktop application integration\\n   - IoT device support\\n   - Cross-chain bridging capabilities\\n\\nWe welcome community feedback and contributions to help prioritize these enhancements.\\n\\n## Contributing\\n\\nContributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.\\n\\n## Credits\\n\\nThis plugin integrates with and builds upon several key technologies:\\n\\n- [Coinbase](https://www.coinbase.com/): Digital currency exchange platform\\n- [Coinbase Commerce](https://commerce.coinbase.com/): Cryptocurrency payment solution\\n- [Coinbase Cloud](https://www.coinbase.com/cloud): Blockchain infrastructure\\n- [Coinbase Advanced Trade API](https://docs.cloud.coinbase.com/advanced-trade-api/): Trading interface\\n- [Coinbase Prime](https://prime.coinbase.com/): Institutional trading platform\\n\\nSpecial thanks to:\\n- The Coinbase development team\\n- The Coinbase Commerce team\\n- The Coinbase Cloud infrastructure team\\n- The Advanced Trade API maintainers\\n- The Eliza community for their contributions and feedback\\n\\nFor more information about Coinbase capabilities:\\n- [Coinbase API Documentation](https://docs.cloud.coinbase.com/)\\n- [Commerce API Reference](https://docs.cloud.coinbase.com/commerce/reference/)\\n- [Advanced Trade Documentation](https://docs.cloud.coinbase.com/advanced-trade-api/)\\n- [Coinbase Prime Documentation](https://docs.prime.coinbase.com/)\\n\\n## License\\n\\nThis plugin is part of the Eliza project. See the main project repository for license information.\\n\\n",
                hash: "840cd021c850df9dca89e6676c2ff3d3d89c81717a7a4809a9c03f329f8926e3",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/README.md",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "f222d880-6a13-0894-8232-2f030278f73e",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "*\\n\\n!dist/**\\n!package.json\\n!readme.md\\n!tsup.config.ts",
                hash: "51ffef50126195f4a9585f61fbf96cc665be2d160db50747c1f932b46624d7a4",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/.npmignore",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "385b61c8-bf51-0edb-917f-f33be468e73d",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: '{\\n    "compilerOptions": {\\n        /* Visit https://aka.ms/tsconfig to read more about this file */\\n        /* Projects */\\n        // "incremental": true,                              /* Save .tsbuildinfo files to allow for incremental compilation of projects. */\\n        // "composite": true,                                /* Enable constraints that allow a TypeScript project to be used with project references. */\\n        // "tsBuildInfoFile": "./.tsbuildinfo",              /* Specify the path to .tsbuildinfo incremental compilation file. */\\n        // "disableSourceOfProjectReferenceRedirect": true,  /* Disable preferring source files instead of declaration files when referencing composite projects. */\\n        // "disableSolutionSearching": true,                 /* Opt a project out of multi-project reference checking when editing. */\\n        // "disableReferencedProjectLoad": true,             /* Reduce the number of projects loaded automatically by TypeScript. */\\n        /* Language and Environment */\\n        "target": "es6" /* Set the JavaScript language version for emitted JavaScript and include compatible library declarations. */,\\n        // "lib": [],                                        /* Specify a set of bundled library declaration files that describe the target runtime environment. */\\n        // "jsx": "preserve",                                /* Specify what JSX code is generated. */\\n        // "experimentalDecorators": true,                   /* Enable experimental support for legacy experimental decorators. */\\n        // "emitDecoratorMetadata": true,                    /* Emit design-type metadata for decorated declarations in source files. */\\n        // "jsxFactory": "",                                 /* Specify the JSX factory function used when targeting React JSX emit, e.g. \'React.createElement\' or \'h\'. */\\n        // "jsxFragmentFactory": "",                         /* Specify the JSX Fragment reference used for fragments when targeting React JSX emit e.g. \'React.Fragment\' or \'Fragment\'. */\\n        // "jsxImportSource": "",                            /* Specify module specifier used to import the JSX factory functions when using \'jsx: react-jsx*\'. */\\n        // "reactNamespace": "",                             /* Specify the object invoked for \'createElement\'. This only applies when targeting \'react\' JSX emit. */\\n        // "noLib": true,                                    /* Disable including any library files, including the default lib.d.ts. */\\n        // "useDefineForClassFields": true,                  /* Emit ECMAScript-standard-compliant class fields. */\\n        // "moduleDetection": "auto",                        /* Control what method is used to detect module-format JS files. */\\n        /* Modules */\\n        "module": "commonjs" /* Specify what module code is generated. */,\\n        "rootDir": "./src" /* Specify the root folder within your source files. */,\\n        // "moduleResolution": "node10",                     /* Specify how TypeScript looks up a file from a given module specifier. */\\n        // "baseUrl": "./",                                  /* Specify the base directory to resolve non-relative module names. */\\n        // "paths": {},                                      /* Specify a set of entries that re-map imports to additional lookup locations. */\\n        // "rootDirs": [],                                   /* Allow multiple folders to be treated as one when resolving modules. */\\n        // "typeRoots": [],                                  /* Specify multiple folders that act like \'./node_modules/@types\'. */\\n        // "types": [],                                      /* Specify type package names to be included without being referenced in a source file. */\\n        // "allowUmdGlobalAccess": true,                     /* Allow accessing UMD globals from modules. */\\n        // "moduleSuffixes": [],                             /* List of file name suffixes to search when resolving a module. */\\n        // "allowImportingTsExtensions": true,               /* Allow imports to include TypeScript file extensions. Requires \'--moduleResolution bundler\' and either \'--noEmit\' or \'--emitDeclarationOnly\' to be set. */\\n        // "resolvePackageJsonExports": true,                /* Use the package.json \'exports\' field when resolving package imports. */\\n        // "resolvePackageJsonImports": true,                /* Use the package.json \'imports\' field when resolving imports. */\\n        // "customConditions": [],                           /* Conditions to set in addition to the resolver-specific defaults when resolving imports. */\\n        // "resolveJsonModule": true,                        /* Enable importing .json files. */\\n        // "allowArbitraryExtensions": true,                 /* Enable importing files with any extension, provided a declaration file is present. */\\n        // "noResolve": true,                                /* Disallow \'import\'s, \'require\'s or \'<reference>\'s from expanding the number of files TypeScript should add to a project. */\\n        /* JavaScript Support */\\n        // "allowJs": true,                                  /* Allow JavaScript files to be a part of your program. Use the \'checkJS\' option to get errors from these files. */\\n        // "checkJs": true,                                  /* Enable error reporting in type-checked JavaScript files. */\\n        // "maxNodeModuleJsDepth": 1,                        /* Specify the maximum folder depth used for checking JavaScript files from \'node_modules\'. Only applicable with \'allowJs\'. */\\n        /* Emit */\\n        // "declaration": true,                              /* Generate .d.ts files from TypeScript and JavaScript files in your project. */\\n        // "declarationMap": true,                           /* Create sourcemaps for d.ts files. */\\n        // "emitDeclarationOnly": true,                      /* Only output d.ts files and not JavaScript files. */\\n        // "sourceMap": true,                                /* Create source map files for emitted JavaScript files. */\\n        // "inlineSourceMap": true,                          /* Include sourcemap files inside the emitted JavaScript. */\\n        // "outFile": "./",                                  /* Specify a file that bundles all outputs into one JavaScript file. If \'declaration\' is true, also designates a file that bundles all .d.ts output. */\\n        "outDir": "./dist" /* Specify an output folder for all emitted files. */,\\n        // "removeComments": true,                           /* Disable emitting comments. */\\n        // "noEmit": true,                                   /* Disable emitting files from a compilation. */\\n        // "importHelpers": true,                            /* Allow importing helper functions from tslib once per project, instead of including them per-file. */\\n        // "downlevelIteration": true,                       /* Emit more compliant, but verbose and less performant JavaScript for iteration. */\\n        // "sourceRoot": "",                                 /* Specify the root path for debuggers to find the reference source code. */\\n        // "mapRoot": "",                                    /* Specify the location where debugger should locate map files instead of generated locations. */\\n        // "inlineSources": true,                            /* Include source code in the sourcemaps inside the emitted JavaScript. */\\n        // "emitBOM": true,                                  /* Emit a UTF-8 Byte Order Mark (BOM) in the beginning of output files. */\\n        // "newLine": "crlf",                                /* Set the newline character for emitting files. */\\n        // "stripInternal": true,                            /* Disable emitting declarations that have \'@internal\' in their JSDoc comments. */\\n        // "noEmitHelpers": true,                            /* Disable generating custom helper functions like \'__extends\' in compiled output. */\\n        // "noEmitOnError": true,                            /* Disable emitting files if any type checking errors are reported. */\\n        // "preserveConstEnums": true,                       /* Disable erasing \'const enum\' declarations in generated code. */\\n        // "declarationDir": "./",                           /* Specify the output directory for generated declaration files. */\\n        /* Interop Constraints */\\n        // "isolatedModules": true,                          /* Ensure that each file can be safely transpiled without relying on other imports. */\\n        // "verbatimModuleSyntax": true,                     /* Do not transform or elide any imports or exports not marked as type-only, ensuring they are written in the output file\'s format based on the \'module\' setting. */\\n        // "isolatedDeclarations": true,                     /* Require sufficient annotation on exports so other tools can trivially generate declaration files. */\\n        // "allowSyntheticDefaultImports": true,             /* Allow \'import x from y\' when a module doesn\'t have a default export. */\\n        "esModuleInterop": true /* Emit additional JavaScript to ease support for importing CommonJS modules. This enables \'allowSyntheticDefaultImports\' for type compatibility. */,\\n        // "preserveSymlinks": true,                         /* Disable resolving symlinks to their realpath. This correlates to the same flag in node. */\\n        "forceConsistentCasingInFileNames": true /* Ensure that casing is correct in imports. */,\\n        /* Type Checking */\\n        "strict": true /* Enable all strict type-checking options. */,\\n        // "noImplicitAny": true,                            /* Enable error reporting for expressions and declarations with an implied \'any\' type. */\\n        // "strictNullChecks": true,                         /* When type checking, take into account \'null\' and \'undefined\'. */\\n        // "strictFunctionTypes": true,                      /* When assigning functions, check to ensure parameters and the return values are subtype-compatible. */\\n        // "strictBindCallApply": true,                      /* Check that the arguments for \'bind\', \'call\', and \'apply\' methods match the original function. */\\n        // "strictPropertyInitialization": true,             /* Check for class properties that are declared but not set in the constructor. */\\n        // "noImplicitThis": true,                           /* Enable error reporting when \'this\' is given the type \'any\'. */\\n        // "useUnknownInCatchVariables": true,               /* Default catch clause variables as \'unknown\' instead of \'any\'. */\\n        // "alwaysStrict": true,                             /* Ensure \'use strict\' is always emitted. */\\n        // "noUnusedLocals": true,                           /* Enable error reporting when local variables aren\'t read. */\\n        // "noUnusedParameters": true,                       /* Raise an error when a function parameter isn\'t read. */\\n        // "exactOptionalPropertyTypes": true,               /* Interpret optional property types as written, rather than adding \'undefined\'. */\\n        // "noImplicitReturns": true,                        /* Enable error reporting for codepaths that do not explicitly return in a function. */\\n        // "noFallthroughCasesInSwitch": true,               /* Enable error reporting for fallthrough cases in switch statements. */\\n        // "noUncheckedIndexedAccess": true,                 /* Add \'undefined\' to a type when accessed using an index. */\\n        // "noImplicitOverride": true,                       /* Ensure overriding members in derived classes are marked with an override modifier. */\\n        // "noPropertyAccessFromIndexSignature": true,       /* Enforces using indexed accessors for keys declared using an indexed type. */\\n        // "allowUnusedLabels": true,                        /* Disable error reporting for unused labels. */\\n        // "allowUnreachableCode": true,                     /* Disable error reporting for unreachable code. */\\n        /* Completeness */\\n        // "skipDefaultLibCheck": true,                      /* Skip type checking .d.ts files that are included with TypeScript. */\\n        "skipLibCheck": true /* Skip type checking all .d.ts files. */\\n    },\\n    "include": [\\n        "src/**/*.ts"\\n    ], // Include all .ts files in the src directory and subdirectories\\n    "exclude": [\\n        "node_modules"\\n    ]\\n}',
                hash: "771fadef4900d6ecefcd6d7a815520861bc0991e35e5c675f4adaea3b5a69922",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/tsconfig.json",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "4e60c270-6651-0cfb-8ad5-448ee1df8a02",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: '{\\n    "name": "@coinbase-samples/advanced-sdk-ts",\\n    "version": "0.1.0",\\n    "main": "dist/main.js",\\n    "scripts": {\\n        "test": "echo \\"Error: no test specified\\" && exit 1",\\n        "build": "tsc",\\n        "lint": "eslint . --ext .js,.ts",\\n        "format": "prettier --write \\"**/*.{js,ts,tsx,json,css,md}\\""\\n    },\\n    "files": [\\n        "dist/"\\n    ],\\n    "keywords": [],\\n    "author": "",\\n    "license": "ISC",\\n    "description": "",\\n    "dependencies": {\\n        "jsonwebtoken": "^9.0.2",\\n        "node-fetch": "^2.6.1"\\n    },\\n    "devDependencies": {\\n        "@types/jsonwebtoken": "^9.0.7",\\n        "@types/node-fetch": "^2.6.11",\\n        "@typescript-eslint/eslint-plugin": "^5.59.0",\\n        "@typescript-eslint/parser": "^5.59.0",\\n        "dotenv": "^16.4.5",\\n        "eslint": "^8.35.0",\\n        "eslint-config-prettier": "^8.5.0",\\n        "eslint-plugin-prettier": "^4.2.1",\\n        "prettier": "^2.8.8",\\n        "typescript": "^5.5.4"\\n    }\\n}\\n',
                hash: "b746c18ab6cd3c2db1170e784f583b905ad49f0a472ba07daf4100f3832c5f8c",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/package.json",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "76ace50a-9ff2-00db-bdaa-dd9e1a4984ab",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: '# Coinbase Advanced API TypeScript SDK\\n\\nWelcome to the Coinbase Advanced API TypeScript SDK. This TypeScript project was created to allow developers to easily plug into the [Coinbase Advanced API](https://docs.cdp.coinbase.com/advanced-trade/docs/welcome).\\n\\nCoinbase Advanced Trade offers a comprehensive API for traders, providing access to real-time market data, order management, and execution. Elevate your trading strategies and develop sophisticated solutions using our powerful tools and features.\\n\\nFor more information on all the available REST endpoints, see the [API Reference](https://docs.cdp.coinbase.com/advanced-trade/reference/).\\n\\n---\\n\\n## Installation\\n\\n```bash\\nnpm install\\n```\\n\\n---\\n\\n## Build and Use\\n\\nTo build the project, run the following command:\\n\\n```bash\\nnpm run build\\n```\\n\\n_Note: To avoid potential issues, do not forget to build your project again after making any changes to it._\\n\\nAfter building the project, each `.ts` file will have its `.js` counterpart generated.\\n\\nTo run a file, use the following command:\\n\\n```\\nnode dist/{INSERT-FILENAME}.js\\n```\\n\\nFor example, a `main.ts` file would be run like:\\n\\n```bash\\nnode dist/main.js\\n```\\n\\n---\\n\\n## Coinbase Developer Platform (CDP) API Keys\\n\\nThis SDK uses Cloud Developer Platform (CDP) API keys. To use this SDK, you will need to create a CDP API key and secret by following the instructions [here](https://docs.cdp.coinbase.com/advanced-trade/docs/getting-started).\\nMake sure to save your API key and secret in a safe place. You will not be able to retrieve your secret again.\\n\\n---\\n\\n## Importing the RESTClient\\n\\nAll the REST endpoints are available directly from the client, therefore it\'s all you need to import.\\n\\n```\\nimport { RESTClient } from \'./rest\';\\n```\\n\\n---\\n\\n## Authentication\\n\\nAuthentication of CDP API Keys is handled automatically by the SDK when making a REST request.\\n\\nAfter creating your CDP API keys, store them using your desired method and simply pass them into the client during initialization like:\\n\\n```\\nconst client = new RESTClient(API_KEY, API_SECRET);\\n```\\n\\n---\\n\\n## Making Requests\\n\\nHere are a few examples requests:\\n\\n**[List Accounts](https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getaccounts)**\\n\\n```\\nclient\\n    .listAccounts({})\\n    .then((result) => {\\n        console.log(result);\\n    })\\n    .catch((error) => {\\n        console.error(error.message);\\n    });\\n```\\n\\n**[Get Product](https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getproduct)**\\n\\n```\\nclient\\n    .getProduct({productId: "BTC-USD"})\\n    .then((result) => {\\n        console.log(result);\\n    })\\n    .catch((error) => {\\n        console.error(error.message);\\n    });\\n```\\n\\n**[Create Order](https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_postorder)**\\n\\n_$10 Market Buy on BTC-USD_\\n\\n```\\nclient\\n    .createOrder({\\n        clientOrderId: "00000001",\\n        productId: "BTC-USD",\\n        side: OrderSide.BUY,\\n        orderConfiguration:{\\n            market_market_ioc: {\\n                quote_size: "10"\\n            }\\n        }\\n    })\\n    .then((result) => {\\n        console.log(result);\\n    })\\n    .catch((error) => {\\n        console.error(error.message);\\n    });\\n```\\n',
                hash: "ffdc7acf84c2c15115dd38132a8e6c167133ebb540121530aae779e3ba3da56b",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/README.md",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "72080ffd-ff16-0019-be2c-b52c691f10f1",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "# Changelog\\n\\n## [0.1.0] - 2024-SEP-06\\n\\n### Added\\n\\n- Support for all Coinbase Advanced API REST endpoints via central client\\n- Custom Request and Response objects for endpoints\\n- Custom error types\\n",
                hash: "b9e64a240bcf51417a89650b113f0bf1a820a04ab93c74d7c45f3c622c6c4e4e",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/CHANGELOG.md",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "5f92f44b-50e3-0a0c-bfd3-c4d8cde6d373",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: '{\\n  "semi": true,\\n  "singleQuote": true,\\n  "trailingComma": "es5"\\n}\\n',
                hash: "cc12cc298a3c9b0b7b4361995e3301e7053c9df400b55e6bb84c272951b99e4d",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/.prettierrc",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "891c4407-317d-0a23-87f3-d3549906f61c",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "/** @type {import('eslint').Linter.Config} */\\nmodule.exports = {\\n  parser: '@typescript-eslint/parser',\\n  extends: [\\n    'eslint:recommended',\\n    'plugin:@typescript-eslint/recommended',\\n    'prettier',\\n    'plugin:prettier/recommended',\\n  ],\\n  plugins: ['prettier'],\\n  rules: {\\n    'prettier/prettier': 'error',\\n    '@typescript-eslint/explicit-module-boundary-types': 'off',\\n    '@typescript-eslint/no-explicit-any': 'off',\\n  },\\n  ignorePatterns: ['**/dist/**', '**/node_modules/**', '**/*.md'],\\n  env: {\\n    node: true, // Add this line to recognize Node.js globals\\n    es2021: true, // Optionally include modern JavaScript features\\n  },\\n};\\n",
                hash: "fe4189dff1219cba8e7fd4a895f7aface40daf81ff46b4c2ff538f7600c98ae8",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/.eslintrc.js",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "2541ff45-8dc4-0b12-af68-24569243eabc",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import {\\n    Coinbase,\\n    Trade,\\n    Transfer,\\n    Wallet,\\n    WalletData,\\n    Webhook,\\n} from "@coinbase/coinbase-sdk";\\nimport { elizaLogger, IAgentRuntime, settings } from "@elizaos/core";\\nimport fs from "fs";\\nimport path from "path";\\nimport { EthereumTransaction } from "@coinbase/coinbase-sdk/dist/client";\\nimport { fileURLToPath } from "url";\\nimport { createArrayCsvWriter } from "csv-writer";\\nimport { Transaction } from "./types";\\n\\n// Dynamically resolve the file path to the src/plugins directory\\nconst __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);\\nconst baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");\\nconst tradeCsvFilePath = path.join(baseDir, "trades.csv");\\nconst transactionCsvFilePath = path.join(baseDir, "transactions.csv");\\nconst webhookCsvFilePath = path.join(baseDir, "webhooks.csv");\\n\\nexport async function initializeWallet(\\n    runtime: IAgentRuntime,\\n    networkId: string = Coinbase.networks.EthereumMainnet\\n) {\\n    let wallet: Wallet;\\n    const storedSeed =\\n        runtime.getSetting("COINBASE_GENERATED_WALLET_HEX_SEED") ??\\n        process.env.COINBASE_GENERATED_WALLET_HEX_SEED;\\n\\n    const storedWalletId =\\n        runtime.getSetting("COINBASE_GENERATED_WALLET_ID") ??\\n        process.env.COINBASE_GENERATED_WALLET_ID;\\n    if (!storedSeed || !storedWalletId) {\\n        // No stored seed or wallet ID, creating a new wallet\\n        wallet = await Wallet.create({ networkId });\\n\\n        // Export wallet data directly\\n        const walletData: WalletData = wallet.export();\\n        const walletAddress = await wallet.getDefaultAddress();\\n        try {\\n            const characterFilePath = `characters/${runtime.character.name.toLowerCase()}.character.json`;\\n            const walletIDSave = await updateCharacterSecrets(\\n                characterFilePath,\\n                "COINBASE_GENERATED_WALLET_ID",\\n                walletData.walletId\\n            );\\n            const seedSave = await updateCharacterSecrets(\\n                characterFilePath,\\n                "COINBASE_GENERATED_WALLET_HEX_SEED",\\n                walletData.seed\\n            );\\n            if (walletIDSave && seedSave) {\\n                elizaLogger.log("Successfully updated character secrets.");\\n            } else {\\n                const seedFilePath = `characters/${runtime.character.name.toLowerCase()}-seed.txt`;\\n                elizaLogger.error(\\n                    `Failed to update character secrets so adding gitignored ${seedFilePath} file please add it your env or character file and delete:`\\n                );\\n                // save it to gitignored file\\n                wallet.saveSeed(seedFilePath);\\n            }\\n            elizaLogger.log(\\n                "Wallet created and stored new wallet:",\\n                walletAddress\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error updating character secrets:", error);\\n            throw error;\\n        }\\n\\n        // Logging wallet creation\\n        elizaLogger.log("Created and stored new wallet:", walletAddress);\\n    } else {\\n        // Importing existing wallet using stored seed and wallet ID\\n        // Always defaults to base-mainnet we can\'t select the network here\\n        wallet = await Wallet.import({\\n            seed: storedSeed,\\n            walletId: storedWalletId,\\n        });\\n        const networkId = wallet.getNetworkId();\\n        elizaLogger.log("Imported existing wallet for network:", networkId);\\n\\n        // Logging wallet import\\n        elizaLogger.log(\\n            "Imported existing wallet:",\\n            await wallet.getDefaultAddress()\\n        );\\n    }\\n\\n    return wallet;\\n}\\n\\n/**\\n * Executes a trade and a charity transfer.\\n * @param {IAgentRuntime} runtime - The runtime for wallet initialization.\\n * @param {string} network - The network to use.\\n * @param {number} amount - The amount to trade and transfer.\\n * @param {string} sourceAsset - The source asset to trade.\\n * @param {string} targetAsset - The target asset to trade.\\n */\\nexport async function executeTradeAndCharityTransfer(\\n    runtime: IAgentRuntime,\\n    network: string,\\n    amount: number,\\n    sourceAsset: string,\\n    targetAsset: string\\n) {\\n    const wallet = await initializeWallet(runtime, network);\\n\\n    elizaLogger.log("Wallet initialized:", {\\n        network,\\n        address: await wallet.getDefaultAddress(),\\n    });\\n\\n    const charityAddress = getCharityAddress(network);\\n    const charityAmount = charityAddress ? amount * 0.01 : 0;\\n    const tradeAmount = charityAddress ? amount - charityAmount : amount;\\n    const assetIdLowercase = sourceAsset.toLowerCase();\\n    const tradeParams = {\\n        amount: tradeAmount,\\n        fromAssetId: assetIdLowercase,\\n        toAssetId: targetAsset.toLowerCase(),\\n    };\\n\\n    let transfer: Transfer;\\n    if (charityAddress && charityAmount > 0) {\\n        transfer = await executeTransfer(\\n            wallet,\\n            charityAmount,\\n            assetIdLowercase,\\n            charityAddress\\n        );\\n        elizaLogger.log("Charity Transfer successful:", {\\n            address: charityAddress,\\n            transactionUrl: transfer.getTransactionLink(),\\n        });\\n        await appendTransactionsToCsv([\\n            {\\n                address: charityAddress,\\n                amount: charityAmount,\\n                status: "Success",\\n                errorCode: null,\\n                transactionUrl: transfer.getTransactionLink(),\\n            },\\n        ]);\\n    }\\n\\n    const trade: Trade = await wallet.createTrade(tradeParams);\\n    elizaLogger.log("Trade initiated:", trade.toString());\\n    await trade.wait();\\n    elizaLogger.log("Trade completed successfully:", trade.toString());\\n    await appendTradeToCsv(trade);\\n    return {\\n        trade,\\n        transfer,\\n    };\\n}\\n\\nexport async function appendTradeToCsv(trade: Trade) {\\n    try {\\n        const csvWriter = createArrayCsvWriter({\\n            path: tradeCsvFilePath,\\n            header: [\\n                "Network",\\n                "From Amount",\\n                "Source Asset",\\n                "To Amount",\\n                "Target Asset",\\n                "Status",\\n                "Transaction URL",\\n            ],\\n            append: true,\\n        });\\n\\n        const formattedTrade = [\\n            trade.getNetworkId(),\\n            trade.getFromAmount(),\\n            trade.getFromAssetId(),\\n            trade.getToAmount(),\\n            trade.getToAssetId(),\\n            trade.getStatus(),\\n            trade.getTransaction().getTransactionLink() || "",\\n        ];\\n\\n        elizaLogger.log("Writing trade to CSV:", formattedTrade);\\n        await csvWriter.writeRecords([formattedTrade]);\\n        elizaLogger.log("Trade written to CSV successfully.");\\n    } catch (error) {\\n        elizaLogger.error("Error writing trade to CSV:", error);\\n    }\\n}\\n\\nexport async function appendTransactionsToCsv(transactions: Transaction[]) {\\n    try {\\n        const csvWriter = createArrayCsvWriter({\\n            path: transactionCsvFilePath,\\n            header: [\\n                "Address",\\n                "Amount",\\n                "Status",\\n                "Error Code",\\n                "Transaction URL",\\n            ],\\n            append: true,\\n        });\\n\\n        const formattedTransactions = transactions.map((transaction) => [\\n            transaction.address,\\n            transaction.amount.toString(),\\n            transaction.status,\\n            transaction.errorCode || "",\\n            transaction.transactionUrl || "",\\n        ]);\\n\\n        elizaLogger.log("Writing transactions to CSV:", formattedTransactions);\\n        await csvWriter.writeRecords(formattedTransactions);\\n        elizaLogger.log("All transactions written to CSV successfully.");\\n    } catch (error) {\\n        elizaLogger.error("Error writing transactions to CSV:", error);\\n    }\\n}\\n// create a function to append webhooks to a csv\\nexport async function appendWebhooksToCsv(webhooks: Webhook[]) {\\n    try {\\n        // Ensure the CSV file exists\\n        if (!fs.existsSync(webhookCsvFilePath)) {\\n            elizaLogger.warn("CSV file not found. Creating a new one.");\\n            const csvWriter = createArrayCsvWriter({\\n                path: webhookCsvFilePath,\\n                header: [\\n                    "Webhook ID",\\n                    "Network ID",\\n                    "Event Type",\\n                    "Event Filters",\\n                    "Event Type Filter",\\n                    "Notification URI",\\n                ],\\n            });\\n            await csvWriter.writeRecords([]); // Create an empty file with headers\\n            elizaLogger.log("New CSV file created with headers.");\\n        }\\n        const csvWriter = createArrayCsvWriter({\\n            path: webhookCsvFilePath,\\n            header: [\\n                "Webhook ID",\\n                "Network ID",\\n                "Event Type",\\n                "Event Filters",\\n                "Event Type Filter",\\n                "Notification URI",\\n            ],\\n            append: true,\\n        });\\n\\n        const formattedWebhooks = webhooks.map((webhook) => [\\n            webhook.getId(),\\n            webhook.getNetworkId(),\\n            webhook.getEventType(),\\n            JSON.stringify(webhook.getEventFilters()),\\n            JSON.stringify(webhook.getEventTypeFilter()),\\n            webhook.getNotificationURI(),\\n        ]);\\n\\n        elizaLogger.log("Writing webhooks to CSV:", formattedWebhooks);\\n        await csvWriter.writeRecords(formattedWebhooks);\\n        elizaLogger.log("All webhooks written to CSV successfully.");\\n    } catch (error) {\\n        elizaLogger.error("Error writing webhooks to CSV:", error);\\n    }\\n}\\n\\n/**\\n * Updates a key-value pair in character.settings.secrets.\\n * @param {string} characterfilePath - The file path to the character.\\n * @param {string} key - The secret key to update or add.\\n * @param {string} value - The new value for the secret key.\\n */\\nexport async function updateCharacterSecrets(\\n    characterfilePath: string,\\n    key: string,\\n    value: string\\n): Promise<boolean> {\\n    try {\\n        const characterFilePath = path.resolve(\\n            process.cwd(),\\n            characterfilePath\\n        );\\n\\n        // Check if the character file exists\\n        if (!fs.existsSync(characterFilePath)) {\\n            elizaLogger.error("Character file not found:", characterFilePath);\\n            return false;\\n        }\\n\\n        // Read the existing character file\\n        const characterData = JSON.parse(\\n            fs.readFileSync(characterFilePath, "utf-8")\\n        );\\n\\n        // Ensure settings and secrets exist in the character file\\n        if (!characterData.settings) {\\n            characterData.settings = {};\\n        }\\n        if (!characterData.settings.secrets) {\\n            characterData.settings.secrets = {};\\n        }\\n\\n        // Update or add the key-value pair\\n        characterData.settings.secrets[key] = value;\\n\\n        // Write the updated data back to the file\\n        fs.writeFileSync(\\n            characterFilePath,\\n            JSON.stringify(characterData, null, 2),\\n            "utf-8"\\n        );\\n\\n        console.log(\\n            `Updated ${key} in character.settings.secrets for ${characterFilePath}.`\\n        );\\n    } catch (error) {\\n        elizaLogger.error("Error updating character secrets:", error);\\n        return false;\\n    }\\n    return true;\\n}\\n\\nexport const getAssetType = (transaction: EthereumTransaction) => {\\n    // Check for ETH\\n    if (transaction.value && transaction.value !== "0") {\\n        return "ETH";\\n    }\\n\\n    // Check for ERC-20 tokens\\n    if (transaction.token_transfers && transaction.token_transfers.length > 0) {\\n        return transaction.token_transfers\\n            .map((transfer) => {\\n                return transfer.token_id;\\n            })\\n            .join(", ");\\n    }\\n\\n    return "N/A";\\n};\\n\\n/**\\n * Fetches and formats wallet balances and recent transactions.\\n *\\n * @param {IAgentRuntime} runtime - The runtime for wallet initialization.\\n * @param {string} networkId - The network ID (optional, defaults to ETH mainnet).\\n * @returns {Promise<{balances: Array<{asset: string, amount: string}>, transactions: Array<any>}>} - An object with formatted balances and transactions.\\n */\\nexport async function getWalletDetails(\\n    runtime: IAgentRuntime,\\n    networkId: string = Coinbase.networks.EthereumMainnet\\n): Promise<{\\n    balances: Array<{ asset: string; amount: string }>;\\n    transactions: Array<{\\n        timestamp: string;\\n        amount: string;\\n        asset: string; // Ensure getAssetType is implemented\\n        status: string;\\n        transactionUrl: string;\\n    }>;\\n}> {\\n    try {\\n        // Initialize the wallet, defaulting to the specified network or ETH mainnet\\n        const wallet = await initializeWallet(runtime, networkId);\\n\\n        // Fetch balances\\n        const balances = await wallet.listBalances();\\n        const formattedBalances = Array.from(balances, (balance) => ({\\n            asset: balance[0],\\n            amount: balance[1].toString(),\\n        }));\\n\\n        // Fetch the wallet\'s recent transactions\\n\\n        const transactionsData = [];\\n        const formattedTransactions = transactionsData.map((transaction) => {\\n            const content = transaction.content();\\n            return {\\n                timestamp: content.block_timestamp || "N/A",\\n                amount: content.value || "N/A",\\n                asset: getAssetType(content) || "N/A", // Ensure getAssetType is implemented\\n                status: transaction.getStatus(),\\n                transactionUrl: transaction.getTransactionLink() || "N/A",\\n            };\\n        });\\n\\n        // Return formatted data\\n        return {\\n            balances: formattedBalances,\\n            transactions: formattedTransactions,\\n        };\\n    } catch (error) {\\n        console.error("Error fetching wallet details:", error);\\n        throw new Error("Unable to retrieve wallet details.");\\n    }\\n}\\n\\n/**\\n * Executes a transfer.\\n * @param {Wallet} wallet - The wallet to use.\\n * @param {number} amount - The amount to transfer.\\n * @param {string} sourceAsset - The source asset to transfer.\\n * @param {string} targetAddress - The target address to transfer to.\\n */\\nexport async function executeTransferAndCharityTransfer(\\n    wallet: Wallet,\\n    amount: number,\\n    sourceAsset: string,\\n    targetAddress: string,\\n    network: string\\n) {\\n    const charityAddress = getCharityAddress(network);\\n    const charityAmount = charityAddress ? amount * 0.01 : 0;\\n    const transferAmount = charityAddress ? amount - charityAmount : amount;\\n    const assetIdLowercase = sourceAsset.toLowerCase();\\n\\n    let charityTransfer: Transfer;\\n    if (charityAddress && charityAmount > 0) {\\n        charityTransfer = await executeTransfer(\\n            wallet,\\n            charityAmount,\\n            assetIdLowercase,\\n            charityAddress\\n        );\\n        elizaLogger.log(\\n            "Charity Transfer successful:",\\n            charityTransfer.toString()\\n        );\\n    }\\n\\n    const transferDetails = {\\n        amount: transferAmount,\\n        assetId: assetIdLowercase,\\n        destination: targetAddress,\\n        gasless: assetIdLowercase === "usdc" ? true : false,\\n    };\\n    elizaLogger.log("Initiating transfer:", transferDetails);\\n    const transfer = await wallet.createTransfer(transferDetails);\\n    elizaLogger.log("Transfer initiated:", transfer.toString());\\n    await transfer.wait();\\n\\n    let responseText = `Transfer executed successfully:\\n- Amount: ${transfer.getAmount()}\\n- Asset: ${assetIdLowercase}\\n- Destination: ${targetAddress}\\n- Transaction URL: ${transfer.getTransactionLink() || ""}`;\\n\\n    if (charityTransfer) {\\n        responseText += `\\n- Charity Amount: ${charityTransfer.getAmount()}\\n- Charity Transaction URL: ${charityTransfer.getTransactionLink() || ""}`;\\n    } else {\\n        responseText += "\\n(Note: Charity transfer was not completed)";\\n    }\\n\\n    elizaLogger.log(responseText);\\n\\n    return {\\n        transfer,\\n        charityTransfer,\\n        responseText,\\n    };\\n}\\n\\n/**\\n * Executes a transfer.\\n * @param {Wallet} wallet - The wallet to use.\\n * @param {number} amount - The amount to transfer.\\n * @param {string} sourceAsset - The source asset to transfer.\\n * @param {string} targetAddress - The target address to transfer to.\\n */\\nexport async function executeTransfer(\\n    wallet: Wallet,\\n    amount: number,\\n    sourceAsset: string,\\n    targetAddress: string\\n) {\\n    const assetIdLowercase = sourceAsset.toLowerCase();\\n    const transferDetails = {\\n        amount,\\n        assetId: assetIdLowercase,\\n        destination: targetAddress,\\n        gasless: assetIdLowercase === "usdc" ? true : false,\\n    };\\n    elizaLogger.log("Initiating transfer:", transferDetails);\\n    let transfer: Transfer | undefined;\\n    try {\\n        transfer = await wallet.createTransfer(transferDetails);\\n        elizaLogger.log("Transfer initiated:", transfer.toString());\\n        await transfer.wait({\\n            intervalSeconds: 1,\\n            timeoutSeconds: 20,\\n        });\\n    } catch (error) {\\n        elizaLogger.error("Error executing transfer:", error);\\n    }\\n    return transfer;\\n}\\n\\n/**\\n * Gets the charity address based on the network.\\n * @param {string} network - The network to use.\\n * @param {boolean} isCharitable - Whether charity donations are enabled\\n * @throws {Error} If charity address for the network is not configured when charity is enabled\\n */\\nexport function getCharityAddress(\\n    network: string,\\n    isCharitable: boolean = false\\n): string | null {\\n    // Check both environment variable and passed parameter\\n    const isCharityEnabled =\\n        process.env.IS_CHARITABLE === "true" && isCharitable;\\n\\n    if (!isCharityEnabled) {\\n        return null;\\n    }\\n    const networkKey = `CHARITY_ADDRESS_${network.toUpperCase()}`;\\n    const charityAddress = settings[networkKey];\\n\\n    if (!charityAddress) {\\n        throw new Error(\\n            `Charity address not configured for network ${network}. Please set ${networkKey} in your environment variables.`\\n        );\\n    }\\n\\n    return charityAddress;\\n}\\n',
                hash: "69d85800b68eb2d631003c0d1216b8698e628c9da10aca43adada2814c33b87e",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/utils.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "ed4debac-82bd-0771-bb2a-84afdf518fb4",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import { Coinbase } from "@coinbase/coinbase-sdk";\\nimport { z } from "zod";\\nimport { WebhookEventType, WebhookEventFilter, WebhookEventTypeFilter } from "@coinbase/coinbase-sdk/dist/client";\\n\\nexport const ChargeSchema = z.object({\\n    id: z.string().nullable(),\\n    price: z.number(),\\n    type: z.string(),\\n    currency: z.string().min(3).max(3),\\n    name: z.string().min(1),\\n    description: z.string().min(1),\\n});\\n\\nexport interface ChargeContent {\\n    id: string | null;\\n    price: number;\\n    type: string;\\n    currency: string; // Currency code (e.g., USD)\\n    name: string; // Name of the charge\\n    description: string; // Description of the charge\\n}\\n\\nexport const isChargeContent = (object: any): object is ChargeContent => {\\n    if (ChargeSchema.safeParse(object).success) {\\n        return true;\\n    }\\n    console.error("Invalid content: ", object);\\n    return false;\\n};\\n\\nexport const TransferSchema = z.object({\\n    network: z.string().toLowerCase(),\\n    receivingAddresses: z.array(z.string()),\\n    transferAmount: z.number(),\\n    assetId: z.string().toLowerCase(),\\n});\\n\\nexport interface TransferContent {\\n    network: string;\\n    receivingAddresses: string[];\\n    transferAmount: number;\\n    assetId: string;\\n}\\n\\nexport const isTransferContent = (object: any): object is TransferContent => {\\n    return TransferSchema.safeParse(object).success;\\n};\\n\\nexport type Transaction = {\\n    address: string;\\n    amount: number;\\n    status: string;\\n    errorCode: string | null;\\n    transactionUrl: string | null;\\n};\\nconst assetValues = Object.values(Coinbase.assets) as [string, ...string[]];\\nexport const TradeSchema = z.object({\\n    network: z.string().toLowerCase(),\\n    amount: z.number(),\\n    sourceAsset: z.enum(assetValues),\\n    targetAsset: z.enum(assetValues),\\n    side: z.enum(["BUY", "SELL"]),\\n});\\n\\nexport interface TradeContent {\\n    network: string;\\n    amount: number;\\n    sourceAsset: string;\\n    targetAsset: string;\\n    side: "BUY" | "SELL";\\n\\n}\\n\\nexport const isTradeContent = (object: any): object is TradeContent => {\\n    return TradeSchema.safeParse(object).success;\\n};\\n\\nexport type TradeTransaction = {\\n    network: string;\\n    amount: number;\\n    sourceAsset: string;\\n    targetAsset: string;\\n    status: string;\\n    errorCode: string | null;\\n    transactionUrl: string | null;\\n};\\n\\nexport interface TokenContractContent {\\n    contractType: "ERC20" | "ERC721" | "ERC1155";\\n    name: string;\\n    symbol: string;\\n    network: string;\\n    baseURI?: string;\\n    totalSupply?: number;\\n}\\n\\nexport const TokenContractSchema = z.object({\\n    contractType: z.enum(["ERC20", "ERC721", "ERC1155"]).describe("The type of token contract to deploy"),\\n    name: z.string().describe("The name of the token"),\\n    symbol: z.string().describe("The symbol of the token"),\\n    network: z.string().describe("The blockchain network to deploy on"),\\n    baseURI: z.string().optional().describe("The base URI for token metadata (required for ERC721 and ERC1155)"),\\n    totalSupply: z.number().optional().describe("The total supply of tokens (only for ERC20)"),\\n}).refine(data => {\\n    if (data.contractType === "ERC20") {\\n        return typeof data.totalSupply === "number" || data.totalSupply === undefined;\\n    }\\n    if (["ERC721", "ERC1155"].includes(data.contractType)) {\\n        return typeof data.baseURI === "string" || data.baseURI === undefined;\\n    }\\n    return true;\\n}, {\\n    message: "Invalid token contract content",\\n    path: ["contractType"],\\n});\\n\\nexport const isTokenContractContent = (obj: any): obj is TokenContractContent => {\\n    return TokenContractSchema.safeParse(obj).success;\\n};\\n\\n// Add to types.ts\\nexport interface ContractInvocationContent {\\n    contractAddress: string;\\n    method: string;\\n    abi: any[];\\n    args?: Record<string, any>;\\n    amount?: string;\\n    assetId: string;\\n    networkId: string;\\n}\\n\\nexport const ContractInvocationSchema = z.object({\\n    contractAddress: z.string().describe("The address of the contract to invoke"),\\n    method: z.string().describe("The method to invoke on the contract"),\\n    abi: z.array(z.any()).describe("The ABI of the contract"),\\n    args: z.record(z.string(), z.any()).optional().describe("The arguments to pass to the contract method"),\\n    amount: z.string().optional().describe("The amount of the asset to send (as string to handle large numbers)"),\\n    assetId: z.string().describe("The ID of the asset to send (e.g., \'USDC\')"),\\n    networkId: z.string().describe("The network ID to use (e.g., \'ethereum-mainnet\')")\\n});\\n\\nexport const isContractInvocationContent = (obj: any): obj is ContractInvocationContent => {\\n    return ContractInvocationSchema.safeParse(obj).success;\\n};\\n\\n\\nexport const WebhookSchema = z.object({\\n    networkId: z.string(),\\n    eventType: z.nativeEnum(WebhookEventType),\\n    eventTypeFilter:z.custom<WebhookEventTypeFilter>().optional(),\\n    eventFilters: z.array(z.custom<WebhookEventFilter>()).optional()\\n});\\n\\nexport type WebhookContent = z.infer<typeof WebhookSchema>;\\n\\nexport const isWebhookContent = (object: any): object is WebhookContent => {\\n    return WebhookSchema.safeParse(object).success;\\n};\\n\\nexport const AdvancedTradeSchema = z.object({\\n    productId: z.string(),\\n    side: z.enum(["BUY", "SELL"]),\\n    amount: z.number(),\\n    orderType: z.enum(["MARKET", "LIMIT"]),\\n    limitPrice: z.number().optional(),\\n});\\n\\nexport interface AdvancedTradeContent {\\n    productId: string;\\n    side: "BUY" | "SELL";\\n    amount: number;\\n    orderType: "MARKET" | "LIMIT";\\n    limitPrice?: number;\\n}\\n\\nexport const isAdvancedTradeContent = (object: any): object is AdvancedTradeContent => {\\n    return AdvancedTradeSchema.safeParse(object).success;\\n};\\n\\nexport interface ReadContractContent {\\n    contractAddress: `0x${string}`;\\n    method: string;\\n    networkId: string;\\n    args: Record<string, any>;\\n    abi?: any[];\\n}\\n\\nexport const ReadContractSchema = z.object({\\n    contractAddress: z.string().describe("The address of the contract to read from"),\\n    method: z.string().describe("The view/pure method to call on the contract"),\\n    networkId: z.string().describe("The network ID to use"),\\n    args: z.record(z.string(), z.any()).describe("The arguments to pass to the contract method"),\\n    abi: z.array(z.any()).optional().describe("The contract ABI (optional)")\\n});\\n\\nexport const isReadContractContent = (obj: any): obj is ReadContractContent => {\\n    return ReadContractSchema.safeParse(obj).success;\\n};',
                hash: "d6268dbae600cbb31291650dc9904d1b77147c1caf86a1e1fc78434f0781948c",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "dbea65e8-5233-0126-9ae0-229d809ff40c",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'export const chargeTemplate = `\\nExtract the following details to create a Coinbase charge:\\n- **price** (number): The amount for the charge (e.g., 100.00).\\n- **currency** (string): The 3-letter ISO 4217 currency code (e.g., USD, EUR).\\n- **type** (string): The pricing type for the charge (e.g., fixed_price, dynamic_price). Assume price type is fixed unless otherwise stated\\n- **name** (string): A non-empty name for the charge (e.g., "The Human Fund").\\n- **description** (string): A non-empty description of the charge (e.g., "Money For People").\\n\\nProvide the values in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "price": <number>,\\n    "currency": "<currency>",\\n    "type": "<type>",\\n    "name": "<name>",\\n    "description": "<description>"\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const getChargeTemplate = `\\nExtract the details for a Coinbase charge using the provided charge ID:\\n- **charge_id** (string): The unique identifier of the charge (e.g., "2b364ef7-ad60-4fcd-958b-e550a3c47dc6").\\n\\nProvide the charge details in the following JSON format after retrieving the charge details:\\n\\n\\`\\`\\`json\\n{\\n    "charge_id": "<charge_id>",\\n    "price": <number>,\\n    "currency": "<currency>",\\n    "type": "<type>",\\n    "name": "<name>",\\n    "description": "<description>",\\n    "status": "<status>",\\n    "created_at": "<ISO8601 timestamp>",\\n    "expires_at": "<ISO8601 timestamp>"\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const transferTemplate = `\\nExtract the following details for processing a mass payout using the Coinbase SDK:\\n- **receivingAddresses** (array): A list of wallet addresses receiving the funds.\\n- **transferAmount** (number): The amount to transfer to each address.\\n- **assetId** (string): The asset ID to transfer (e.g., ETH, BTC).\\n- **network** (string): The blockchain network to use. Allowed values are:\\n    static networks: {\\n        readonly BaseSepolia: "base-sepolia";\\n        readonly BaseMainnet: "base-mainnet";\\n        readonly EthereumHolesky: "ethereum-holesky";\\n        readonly EthereumMainnet: "ethereum-mainnet";\\n        readonly PolygonMainnet: "polygon-mainnet";\\n        readonly SolanaDevnet: "solana-devnet";\\n        readonly SolanaMainnet: "solana-mainnet";\\n        readonly ArbitrumMainnet: "arbitrum-mainnet";\\n    };\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "receivingAddresses": ["<receiving_address_1>", "<receiving_address_2>"],\\n    "transferAmount": <amount>,\\n    "assetId": "<asset_id>",\\n    "network": "<network>"\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const tradeTemplate = `\\nExtract the following details for processing a trade using the Coinbase SDK:\\n- **network** (string): The blockchain network to use (e.g., base, sol, eth, arb, pol).\\n- **amount** (number): The amount to trade.\\n- **sourceAsset** (string): The asset ID to trade from (must be one of: ETH, SOL, USDC, WETH, GWEI, LAMPORT).\\n- **targetAsset** (string): The asset ID to trade to (must be one of: ETH, SOL, USDC, WETH, GWEI, LAMPORT).\\n- **side** (string): The side of the trade (must be either "BUY" or "SELL").\\n\\nEnsure that:\\n1. **network** is one of the supported networks: "base", "sol", "eth", "arb", or "pol".\\n2. **sourceAsset** and **targetAsset** are valid assets from the provided list.\\n3. **amount** is a positive number.\\n4. **side** is either "BUY" or "SELL".\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "network": "<network>",\\n    "amount": <amount>,\\n    "sourceAsset": "<source_asset_id>",\\n    "targetAsset": "<target_asset_id>",\\n    "side": "<side>"\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const advancedTradeTemplate = `\\nExtract the following details for processing an advanced trade using the Coinbase Advanced Trading API:\\n- **productId** (string): The trading pair ID (e.g., "BTC-USD", "ETH-USD", "SOL-USD")\\n- **side** (string): The side of the trade (must be either "BUY" or "SELL")\\n- **amount** (number): The amount to trade\\n- **orderType** (string): The type of order (must be either "MARKET" or "LIMIT")\\n- **limitPrice** (number, optional): The limit price for limit orders\\n\\nEnsure that:\\n1. **productId** follows the format "ASSET-USD" (e.g., "BTC-USD")\\n2. **side** is either "BUY" or "SELL"\\n3. **amount** is a positive number\\n4. **orderType** is either "MARKET" or "LIMIT"\\n5. **limitPrice** is provided when orderType is "LIMIT"\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "productId": "<product_id>",\\n    "side": "<side>",\\n    "amount": <amount>,\\n    "orderType": "<order_type>",\\n    "limitPrice": <limit_price>\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\n\\nexport const tokenContractTemplate = `\\nExtract the following details for deploying a token contract using the Coinbase SDK:\\n- **contractType** (string): The type of token contract to deploy (ERC20, ERC721, or ERC1155)\\n- **name** (string): The name of the token\\n- **symbol** (string): The symbol of the token\\n- **network** (string): The blockchain network to deploy on (e.g., base, eth, arb, pol)\\n- **baseURI** (string, optional): The base URI for token metadata (required for ERC721 and ERC1155)\\n- **totalSupply** (number, optional): The total supply of tokens (only for ERC20)\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "contractType": "<contract_type>",\\n    "name": "<token_name>",\\n    "symbol": "<token_symbol>",\\n    "network": "<network>",\\n    "baseURI": "<base_uri>",\\n    "totalSupply": <total_supply>\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\n// Add to templates.ts\\nexport const contractInvocationTemplate = `\\nExtract the following details for invoking a smart contract using the Coinbase SDK:\\n- **contractAddress** (string): The address of the contract to invoke\\n- **method** (string): The method to invoke on the contract\\n- **abi** (array): The ABI of the contract\\n- **args** (object, optional): The arguments to pass to the contract method\\n- **amount** (string, optional): The amount of the asset to send (as string to handle large numbers)\\n- **assetId** (string, required): The ID of the asset to send (e.g., \'USDC\')\\n- **networkId** (string, required): The network ID to use in format "chain-network".\\n static networks: {\\n        readonly BaseSepolia: "base-sepolia";\\n        readonly BaseMainnet: "base-mainnet";\\n        readonly EthereumHolesky: "ethereum-holesky";\\n        readonly EthereumMainnet: "ethereum-mainnet";\\n        readonly PolygonMainnet: "polygon-mainnet";\\n        readonly SolanaDevnet: "solana-devnet";\\n        readonly SolanaMainnet: "solana-mainnet";\\n        readonly ArbitrumMainnet: "arbitrum-mainnet";\\n    };\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "contractAddress": "<contract_address>",\\n    "method": "<method_name>",\\n    "abi": [<contract_abi>],\\n    "args": {\\n        "<arg_name>": "<arg_value>"\\n    },\\n    "amount": "<amount_as_string>",\\n    "assetId": "<asset_id>",\\n    "networkId": "<network_id>"\\n}\\n\\`\\`\\`\\n\\nExample for invoking a transfer method on the USDC contract:\\n\\n\\`\\`\\`json\\n{\\n    "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",\\n    "method": "transfer",\\n    "abi": [\\n        {\\n            "constant": false,\\n            "inputs": [\\n                {\\n                    "name": "to",\\n                    "type": "address"\\n                },\\n                {\\n                    "name": "amount",\\n                    "type": "uint256"\\n                }\\n            ],\\n            "name": "transfer",\\n            "outputs": [\\n                {\\n                    "name": "",\\n                    "type": "bool"\\n                }\\n            ],\\n            "payable": false,\\n            "stateMutability": "nonpayable",\\n            "type": "function"\\n        }\\n    ],\\n    "args": {\\n        "to": "0xbcF7C64B880FA89a015970dC104E848d485f99A3",\\n        "amount": "1000000" // 1 USDC (6 decimals)\\n    },\\n    "networkId": "ethereum-mainnet",\\n    "assetId": "USDC"\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const webhookTemplate = `\\nExtract the following details for creating a webhook:\\n- **networkId** (string): The network ID for which the webhook is created.\\nAllowed values are:\\n    static networks: {\\n        readonly BaseSepolia: "base-sepolia";\\n        readonly BaseMainnet: "base-mainnet";\\n        readonly EthereumHolesky: "ethereum-holesky";\\n        readonly EthereumMainnet: "ethereum-mainnet";\\n        readonly PolygonMainnet: "polygon-mainnet";\\n        readonly SolanaDevnet: "solana-devnet";\\n        readonly SolanaMainnet: "solana-mainnet";\\n        readonly ArbitrumMainnet: "arbitrum-mainnet";\\n    };\\n- **eventType** (string): The type of event for the webhook.\\nexport declare const WebhookEventType: {\\n    readonly Unspecified: "unspecified";\\n    readonly Erc20Transfer: "erc20_transfer";\\n    readonly Erc721Transfer: "erc721_transfer";\\n    readonly WalletActivity: "wallet_activity";\\n};\\n- **eventTypeFilter** (string, optional): Filter for wallet activity event type.\\nexport interface WebhookEventTypeFilter {\\n    /**\\n     * A list of wallet addresses to filter on.\\n     * @type {Array<string>}\\n     * @memberof WebhookWalletActivityFilter\\n     */\\n    \'addresses\'?: Array<string>;\\n    /**\\n     * The ID of the wallet that owns the webhook.\\n     * @type {string}\\n     * @memberof WebhookWalletActivityFilter\\n     */\\n    \'wallet_id\'?: string;\\n}\\n- **eventFilters** (array, optional): Filters applied to the events that determine which specific events trigger the webhook.\\nexport interface Array<WebhookEventFilter> {\\n    /**\\n     * The onchain contract address of the token for which the events should be tracked.\\n     * @type {string}\\n     * @memberof WebhookEventFilter\\n     */\\n    \'contract_address\'?: string;\\n    /**\\n     * The onchain address of the sender. Set this filter to track all transfer events originating from your address.\\n     * @type {string}\\n     * @memberof WebhookEventFilter\\n     */\\n    \'from_address\'?: string;\\n    /**\\n     * The onchain address of the receiver. Set this filter to track all transfer events sent to your address.\\n     * @type {string}\\n     * @memberof WebhookEventFilter\\n     */\\n    \'to_address\'?: string;\\n}\\nProvide the details in the following JSON format:\\n\\`\\`\\`json\\n{\\n    "networkId": "<networkId>",\\n    "eventType": "<eventType>",\\n    "eventTypeFilter": "<eventTypeFilter>",\\n    "eventFilters": [<eventFilter1>, <eventFilter2>]\\n}\\n\\`\\`\\`\\n\\n\\n\\nExample for creating a webhook on the Sepolia testnet for ERC20 transfers originating from a specific wallet 0x1234567890123456789012345678901234567890 on transfers from 0xbcF7C64B880FA89a015970dC104E848d485f99A3\\n\\n\\`\\`\\`javascript\\n\\n    networkId: \'base-sepolia\', // Listening on sepolia testnet transactions\\n    eventType: \'erc20_transfer\',\\n    eventTypeFilter: {\\n      addresses: [\'0x1234567890123456789012345678901234567890\']\\n    },\\n    eventFilters: [{\\n      from_address: \'0xbcF7C64B880FA89a015970dC104E848d485f99A3\',\\n    }],\\n});\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const readContractTemplate = `\\nExtract the following details for reading from a smart contract using the Coinbase SDK:\\n- **contractAddress** (string): The address of the contract to read from (must start with 0x)\\n- **method** (string): The view/pure method to call on the contract\\n- **networkId** (string): The network ID based on networks configured in Coinbase SDK\\nAllowed values are:\\n    static networks: {\\n        readonly BaseSepolia: "base-sepolia";\\n        readonly BaseMainnet: "base-mainnet";\\n        readonly EthereumHolesky: "ethereum-holesky";\\n        readonly EthereumMainnet: "ethereum-mainnet";\\n        readonly PolygonMainnet: "polygon-mainnet";\\n        readonly SolanaDevnet: "solana-devnet";\\n        readonly SolanaMainnet: "solana-mainnet";\\n        readonly ArbitrumMainnet: "arbitrum-mainnet";\\n    };\\n- **args** (object): The arguments to pass to the contract method\\n- **abi** (array, optional): The contract ABI if needed for complex interactions\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "contractAddress": "<0x-prefixed-address>",\\n    "method": "<method_name>",\\n    "networkId": "<network_id>",\\n    "args": {\\n        "<arg_name>": "<arg_value>"\\n    },\\n    "abi": [\\n        // Optional ABI array\\n    ]\\n}\\n\\`\\`\\`\\n\\nExample for reading the balance of an ERC20 token:\\n\\n\\`\\`\\`json\\n{\\n    "contractAddress": "0x37f2131ebbc8f97717edc3456879ef56b9f4b97b",\\n    "method": "balanceOf",\\n    "networkId": "eth-mainnet",\\n    "args": {\\n        "account": "0xbcF7C64B880FA89a015970dC104E848d485f99A3"\\n    }\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;',
                hash: "8bcacdfa3ca93b5a9b553a8a5f6535627a386ea29001846864fb3108193e7a17",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/templates.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "4c3b1b0e-bf46-0aed-a53f-77159b20a8cf",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import { coinbaseMassPaymentsPlugin } from "./plugins/massPayments";\\nimport { coinbaseCommercePlugin } from "./plugins/commerce";\\nimport { tradePlugin } from "./plugins/trade";\\nimport { tokenContractPlugin } from "./plugins/tokenContract";\\nimport { webhookPlugin } from "./plugins/webhooks";\\nimport { advancedTradePlugin } from "./plugins/advancedTrade";\\n\\nexport const plugins = {\\n    coinbaseMassPaymentsPlugin,\\n    coinbaseCommercePlugin,\\n    tradePlugin,\\n    tokenContractPlugin,\\n    webhookPlugin,\\n    advancedTradePlugin,\\n};\\n\\nexport * from "./plugins/massPayments";\\nexport * from "./plugins/commerce";\\nexport * from "./plugins/trade";\\nexport * from "./plugins/tokenContract";\\nexport * from "./plugins/webhooks";\\nexport * from "./plugins/advancedTrade";\\n',
                hash: "6a09c58be16ec7d623e930899001c65baf983550a99ae2e3935a21c140f79e06",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/index.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "65d45173-1633-0c37-9f46-3b48574436eb",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'export const ABI = [\\n    {\\n        inputs: [],\\n        name: "name",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "string",\\n                internalType: "string"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                name: "spender",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                name: "amount",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        name: "approve",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "bool",\\n                internalType: "bool"\\n            }\\n        ],\\n        stateMutability: "nonpayable",\\n        type: "function"\\n    },\\n    {\\n        inputs: [],\\n        name: "totalSupply",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                name: "from",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                name: "to",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                name: "amount",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        name: "transferFrom",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "bool",\\n                internalType: "bool"\\n            }\\n        ],\\n        stateMutability: "nonpayable",\\n        type: "function"\\n    },\\n    {\\n        inputs: [],\\n        name: "decimals",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "uint8",\\n                internalType: "uint8"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                name: "account",\\n                type: "address",\\n                internalType: "address"\\n            }\\n        ],\\n        name: "balanceOf",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [],\\n        name: "symbol",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "string",\\n                internalType: "string"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                name: "to",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                name: "amount",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        name: "transfer",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "bool",\\n                internalType: "bool"\\n            }\\n        ],\\n        stateMutability: "nonpayable",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                name: "owner",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                name: "spender",\\n                type: "address",\\n                internalType: "address"\\n            }\\n        ],\\n        name: "allowance",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                indexed: true,\\n                name: "owner",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                indexed: true,\\n                name: "spender",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                indexed: false,\\n                name: "value",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        name: "Approval",\\n        type: "event",\\n        anonymous: false\\n    },\\n    {\\n        inputs: [\\n            {\\n                indexed: true,\\n                name: "from",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                indexed: true,\\n                name: "to",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                indexed: false,\\n                name: "value",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        name: "Transfer",\\n        type: "event",\\n        anonymous: false\\n    }\\n];',
                hash: "1efec9e09a67c91bcd292440590e52ca5518bbf79a0f5158b37ce35b6f4a418a",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/constants.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "1359bfc3-88a7-03db-8172-3ab90411c4f5",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import jwt from 'jsonwebtoken';\\nimport { BASE_URL, ALGORITHM, JWT_ISSUER } from './constants';\\nimport crypto from 'crypto';\\n\\nexport function generateToken(\\n  requestMethod: string,\\n  requestPath: string,\\n  apiKey: string,\\n  apiSecret: string\\n): string {\\n  const uri = `${requestMethod} ${BASE_URL}${requestPath}`;\\n  const payload = {\\n    iss: JWT_ISSUER,\\n    nbf: Math.floor(Date.now() / 1000),\\n    exp: Math.floor(Date.now() / 1000) + 120,\\n    sub: apiKey,\\n    uri,\\n  };\\n\\n  const header = {\\n    alg: ALGORITHM,\\n    kid: apiKey,\\n    nonce: crypto.randomBytes(16).toString('hex'),\\n  };\\n  const options: jwt.SignOptions = {\\n    algorithm: ALGORITHM as jwt.Algorithm,\\n    header: header,\\n  };\\n\\n  return jwt.sign(payload, apiSecret as string, options);\\n}\\n",
                hash: "e18c3bd7a82e3f40f58959c04a9de202ed7bee3d6d477e643e5ac515ba6dc80a",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/jwt-generator.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "9d6ba322-f8a2-02fd-8e7d-585d287d47b9",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "export const BASE_URL = 'api.coinbase.com';\\nexport const API_PREFIX = '/api/v3/brokerage';\\nexport const ALGORITHM = 'ES256';\\nexport const VERSION = '0.1.0';\\nexport const USER_AGENT = `coinbase-advanced-ts/${VERSION}`;\\nexport const JWT_ISSUER = 'cdp';\\n",
                hash: "8533bae5c30e839771cbafc05e756a7bcfb2f825e172472d7ab4b787f0c21723",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/constants.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "4c822d37-abbb-0b88-9afb-666a5af57fb9",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import { Coinbase, Webhook } from "@coinbase/coinbase-sdk";\\nimport {\\n    Action,\\n    Plugin,\\n    elizaLogger,\\n    IAgentRuntime,\\n    Memory,\\n    HandlerCallback,\\n    State,\\n    composeContext,\\n    generateObject,\\n    ModelClass,\\n    Provider,\\n} from "@elizaos/core";\\nimport { WebhookSchema, isWebhookContent, WebhookContent } from "../types";\\nimport { webhookTemplate } from "../templates";\\nimport { appendWebhooksToCsv } from "../utils";\\n\\nexport const webhookProvider: Provider = {\\n    get: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.debug("Starting webhookProvider.get function");\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            // List all webhooks\\n            const resp = await Webhook.list();\\n            elizaLogger.info("Listing all webhooks:", resp.data);\\n\\n            return {\\n                webhooks: resp.data.map((webhook: Webhook) => ({\\n                    id: webhook.getId(),\\n                    networkId: webhook.getNetworkId(),\\n                    eventType: webhook.getEventType(),\\n                    eventFilters: webhook.getEventFilters(),\\n                    eventTypeFilter: webhook.getEventTypeFilter(),\\n                    notificationURI: webhook.getNotificationURI(),\\n                })),\\n            };\\n        } catch (error) {\\n            elizaLogger.error("Error in webhookProvider:", error);\\n            return [];\\n        }\\n    },\\n};\\n\\nexport const createWebhookAction: Action = {\\n    name: "CREATE_WEBHOOK",\\n    description: "Create a new webhook using the Coinbase SDK.",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime for CREATE_WEBHOOK...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_NOTIFICATION_URI ||\\n                process.env.COINBASE_NOTIFICATION_URI\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting CREATE_WEBHOOK handler...");\\n\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            const context = composeContext({\\n                state,\\n                template: webhookTemplate,\\n            });\\n\\n            const webhookDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.LARGE,\\n                schema: WebhookSchema,\\n            });\\n\\n            if (!isWebhookContent(webhookDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid webhook details. Ensure network, URL, event type, and contract address are correctly specified.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const { networkId, eventType, eventFilters, eventTypeFilter } =\\n                webhookDetails.object as WebhookContent;\\n            const notificationUri =\\n                runtime.getSetting("COINBASE_NOTIFICATION_URI") ??\\n                process.env.COINBASE_NOTIFICATION_URI;\\n\\n            if (!notificationUri) {\\n                callback(\\n                    {\\n                        text: "Notification URI is not set in the environment variables.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n            elizaLogger.info("Creating webhook with details:", {\\n                networkId,\\n                notificationUri,\\n                eventType,\\n                eventTypeFilter,\\n                eventFilters,\\n            });\\n            const webhook = await Webhook.create({\\n                networkId,\\n                notificationUri,\\n                eventType,\\n                eventFilters,\\n            });\\n            elizaLogger.info(\\n                "Webhook created successfully:",\\n                webhook.toString()\\n            );\\n            callback(\\n                {\\n                    text: `Webhook created successfully: ${webhook.toString()}`,\\n                },\\n                []\\n            );\\n            await appendWebhooksToCsv([webhook]);\\n            elizaLogger.info("Webhook appended to CSV successfully");\\n        } catch (error) {\\n            elizaLogger.error("Error during webhook creation:", error);\\n            callback(\\n                {\\n                    text: "Failed to create the webhook. Please check the logs for more details.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    similes: ["WEBHOOK", "NOTIFICATION", "EVENT", "TRIGGER", "LISTENER"],\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Create a webhook on base for address 0xbcF7C64B880FA89a015970dC104E848d485f99A3 on the event type: transfers",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Webhook created successfully: Webhook ID: {{webhookId}}, Network ID: {{networkId}}, Notification URI: {{notificationUri}}, Event Type: {{eventType}}`,\\n                    action: "CREATE_WEBHOOK",\\n                },\\n            },\\n        ],\\n    ],\\n};\\n\\nexport const webhookPlugin: Plugin = {\\n    name: "webhookPlugin",\\n    description: "Manages webhooks using the Coinbase SDK.",\\n    actions: [createWebhookAction],\\n    providers: [webhookProvider],\\n};\\n',
                hash: "5fc0a933aac0510e406df2ee09d0296d9d8694777ff8ed1e2a48956c14e5649b",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/plugins/webhooks.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "5af49f77-82d9-0c60-ab64-a165c95827c1",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import { Coinbase } from "@coinbase/coinbase-sdk";\\nimport {\\n    Action,\\n    Plugin,\\n    elizaLogger,\\n    IAgentRuntime,\\n    Memory,\\n    HandlerCallback,\\n    State,\\n    composeContext,\\n    generateObject,\\n    ModelClass,\\n    Provider,\\n} from "@elizaos/core";\\nimport { executeTradeAndCharityTransfer, getWalletDetails } from "../utils";\\nimport { tradeTemplate } from "../templates";\\nimport { isTradeContent, TradeContent, TradeSchema } from "../types";\\nimport { readFile } from "fs/promises";\\nimport { parse } from "csv-parse/sync";\\nimport path from "path";\\nimport { fileURLToPath } from "url";\\nimport fs from "fs";\\nimport { createArrayCsvWriter } from "csv-writer";\\n\\n// Dynamically resolve the file path to the src/plugins directory\\nconst __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);\\nconst baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");\\nconst tradeCsvFilePath = path.join(baseDir, "trades.csv");\\n\\nexport const tradeProvider: Provider = {\\n    get: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.debug("Starting tradeProvider.get function");\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n            elizaLogger.info("Reading CSV file from:", tradeCsvFilePath);\\n\\n            // Check if the file exists; if not, create it with headers\\n            if (!fs.existsSync(tradeCsvFilePath)) {\\n                elizaLogger.warn("CSV file not found. Creating a new one.");\\n                const csvWriter = createArrayCsvWriter({\\n                    path: tradeCsvFilePath,\\n                    header: [\\n                        "Network",\\n                        "From Amount",\\n                        "Source Asset",\\n                        "To Amount",\\n                        "Target Asset",\\n                        "Status",\\n                        "Transaction URL",\\n                    ],\\n                });\\n                await csvWriter.writeRecords([]); // Create an empty file with headers\\n                elizaLogger.info("New CSV file created with headers.");\\n            }\\n\\n            // Read and parse the CSV file\\n            const csvData = await readFile(tradeCsvFilePath, "utf-8");\\n            const records = parse(csvData, {\\n                columns: true,\\n                skip_empty_lines: true,\\n            });\\n\\n            elizaLogger.info("Parsed CSV records:", records);\\n            const { balances, transactions } = await getWalletDetails(runtime);\\n            elizaLogger.info("Current Balances:", balances);\\n            elizaLogger.info("Last Transactions:", transactions);\\n            return {\\n                currentTrades: records.map((record: any) => ({\\n                    network: record["Network"] || undefined,\\n                    amount: parseFloat(record["From Amount"]) || undefined,\\n                    sourceAsset: record["Source Asset"] || undefined,\\n                    toAmount: parseFloat(record["To Amount"]) || undefined,\\n                    targetAsset: record["Target Asset"] || undefined,\\n                    status: record["Status"] || undefined,\\n                    transactionUrl: record["Transaction URL"] || "",\\n                })),\\n                balances,\\n                transactions,\\n            };\\n        } catch (error) {\\n            elizaLogger.error("Error in tradeProvider:", error);\\n            return [];\\n        }\\n    },\\n};\\n\\nexport const executeTradeAction: Action = {\\n    name: "EXECUTE_TRADE",\\n    description:\\n        "Execute a trade between two assets using the Coinbase SDK and log the result.",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime for EXECUTE_TRADE...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting EXECUTE_TRADE handler...");\\n\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            const context = composeContext({\\n                state,\\n                template: tradeTemplate,\\n            });\\n\\n            const tradeDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.LARGE,\\n                schema: TradeSchema,\\n            });\\n\\n            if (!isTradeContent(tradeDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid trade details. Ensure network, amount, source asset, and target asset are correctly specified.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const { network, amount, sourceAsset, targetAsset } =\\n                tradeDetails.object as TradeContent;\\n\\n            const allowedNetworks = ["base", "sol", "eth", "arb", "pol"];\\n            if (!allowedNetworks.includes(network)) {\\n                callback(\\n                    {\\n                        text: `Invalid network. Supported networks are: ${allowedNetworks.join(\\n                            ", "\\n                        )}.`,\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const { trade, transfer } = await executeTradeAndCharityTransfer(\\n                runtime,\\n                network,\\n                amount,\\n                sourceAsset,\\n                targetAsset\\n            );\\n\\n            let responseText = `Trade executed successfully:\\n- Network: ${network}\\n- Amount: ${trade.getFromAmount()}\\n- From: ${sourceAsset}\\n- To: ${targetAsset}\\n- Transaction URL: ${trade.getTransaction().getTransactionLink() || ""}\\n- Charity Transaction URL: ${transfer.getTransactionLink() || ""}`;\\n\\n            if (transfer) {\\n                responseText += `\\n- Charity Amount: ${transfer.getAmount()}`;\\n            } else {\\n                responseText += "\\n(Note: Charity transfer was not completed)";\\n            }\\n\\n            callback({ text: responseText }, []);\\n        } catch (error) {\\n            elizaLogger.error("Error during trade execution:", error);\\n            callback(\\n                {\\n                    text: "Failed to execute the trade. Please check the logs for more details.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Swap 1 ETH for USDC on base network",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Swapped 1 ETH for USDC on base network\\n- Transaction URL: https://basescan.io/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Convert 1000 USDC to SOL on Solana",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Converted 1000 USDC to SOL on Solana network\\n- Transaction URL: https://solscan.io/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Exchange 5 WETH for ETH on Arbitrum",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Exchanged 5 WETH for ETH on Arbitrum network\\n- Transaction URL: https://arbiscan.io/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Trade 100 GWEI for USDC on Polygon",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Traded 100 GWEI for USDC on Polygon network\\n- Transaction URL: https://polygonscan.com/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Market buy ETH with 500 USDC on base",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Bought ETH with 500 USDC on base network\\n- Transaction URL: https://basescan.io/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Sell 2.5 SOL for USDC on Solana mainnet",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Sold 2.5 SOL for USDC on Solana network\\n- Transaction URL: https://solscan.io/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n    ],\\n    similes: [\\n        "EXECUTE_TRADE", // Primary action name\\n        "SWAP_TOKENS", // For token swaps\\n        "CONVERT_CURRENCY", // For currency conversion\\n        "EXCHANGE_ASSETS", // For asset exchange\\n        "MARKET_BUY", // For buying assets\\n        "MARKET_SELL", // For selling assets\\n        "TRADE_CRYPTO", // Generic crypto trading\\n    ],\\n};\\n\\nexport const tradePlugin: Plugin = {\\n    name: "tradePlugin",\\n    description: "Enables asset trading using the Coinbase SDK.",\\n    actions: [executeTradeAction],\\n    providers: [tradeProvider],\\n};\\n',
                hash: "fc278359c6eb10d3da3582ac9375baaeb3d2215a266d7a4810836304aac4b54b",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/plugins/trade.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "df59ebc8-57d3-0119-a5b0-ae096f7165bb",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import { Coinbase, readContract, SmartContract } from "@coinbase/coinbase-sdk";\\nimport {\\n    Action,\\n    Plugin,\\n    elizaLogger,\\n    IAgentRuntime,\\n    Memory,\\n    HandlerCallback,\\n    State,\\n    composeContext,\\n    generateObject,\\n    ModelClass,\\n} from "@elizaos/core";\\nimport { initializeWallet } from "../utils";\\nimport {\\n    contractInvocationTemplate,\\n    tokenContractTemplate,\\n    readContractTemplate,\\n} from "../templates";\\nimport {\\n    ContractInvocationSchema,\\n    TokenContractSchema,\\n    isContractInvocationContent,\\n    isTokenContractContent,\\n    ReadContractSchema,\\n    isReadContractContent,\\n} from "../types";\\nimport path from "path";\\nimport { fileURLToPath } from "url";\\nimport { createArrayCsvWriter } from "csv-writer";\\nimport fs from "fs";\\nimport { ABI } from "../constants";\\n\\n// Dynamically resolve the file path to the src/plugins directory\\nconst __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);\\nconst baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");\\nconst contractsCsvFilePath = path.join(baseDir, "contracts.csv");\\n\\n// Add this helper at the top level\\nconst serializeBigInt = (value: any): any => {\\n    if (typeof value === "bigint") {\\n        return value.toString();\\n    }\\n    if (Array.isArray(value)) {\\n        return value.map(serializeBigInt);\\n    }\\n    if (typeof value === "object" && value !== null) {\\n        return Object.fromEntries(\\n            Object.entries(value).map(([k, v]) => [k, serializeBigInt(v)])\\n        );\\n    }\\n    return value;\\n};\\n\\nexport const deployTokenContractAction: Action = {\\n    name: "DEPLOY_TOKEN_CONTRACT",\\n    description:\\n        "Deploy an ERC20, ERC721, or ERC1155 token contract using the Coinbase SDK",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime for DEPLOY_TOKEN_CONTRACT...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting DEPLOY_TOKEN_CONTRACT handler...");\\n\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            // Ensure CSV file exists\\n            if (!fs.existsSync(contractsCsvFilePath)) {\\n                const csvWriter = createArrayCsvWriter({\\n                    path: contractsCsvFilePath,\\n                    header: [\\n                        "Contract Type",\\n                        "Name",\\n                        "Symbol",\\n                        "Network",\\n                        "Contract Address",\\n                        "Transaction URL",\\n                        "Base URI",\\n                        "Total Supply",\\n                    ],\\n                });\\n                await csvWriter.writeRecords([]);\\n            }\\n\\n            const context = composeContext({\\n                state,\\n                template: tokenContractTemplate,\\n            });\\n\\n            const contractDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.SMALL,\\n                schema: TokenContractSchema,\\n            });\\n            elizaLogger.info("Contract details:", contractDetails.object);\\n\\n            if (!isTokenContractContent(contractDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid contract details. Please check the inputs.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const {\\n                contractType,\\n                name,\\n                symbol,\\n                network,\\n                baseURI,\\n                totalSupply,\\n            } = contractDetails.object;\\n            elizaLogger.info("Contract details:", contractDetails.object);\\n            const wallet = await initializeWallet(runtime, network);\\n            let contract: SmartContract;\\n            let deploymentDetails;\\n\\n            switch (contractType.toLowerCase()) {\\n                case "erc20":\\n                    contract = await wallet.deployToken({\\n                        name,\\n                        symbol,\\n                        totalSupply: totalSupply || 1000000,\\n                    });\\n                    deploymentDetails = {\\n                        contractType: "ERC20",\\n                        totalSupply,\\n                        baseURI: "N/A",\\n                    };\\n                    break;\\n\\n                case "erc721":\\n                    contract = await wallet.deployNFT({\\n                        name,\\n                        symbol,\\n                        baseURI: baseURI || "",\\n                    });\\n                    deploymentDetails = {\\n                        contractType: "ERC721",\\n                        totalSupply: "N/A",\\n                        baseURI,\\n                    };\\n                    break;\\n                default:\\n                    throw new Error(\\n                        `Unsupported contract type: ${contractType}`\\n                    );\\n            }\\n\\n            // Wait for deployment to complete\\n            await contract.wait();\\n            elizaLogger.info("Deployment details:", deploymentDetails);\\n            elizaLogger.info("Contract deployed successfully:", contract);\\n            // Log deployment to CSV\\n            const csvWriter = createArrayCsvWriter({\\n                path: contractsCsvFilePath,\\n                header: [\\n                    "Contract Type",\\n                    "Name",\\n                    "Symbol",\\n                    "Network",\\n                    "Contract Address",\\n                    "Transaction URL",\\n                    "Base URI",\\n                    "Total Supply",\\n                ],\\n                append: true,\\n            });\\n            const transaction =\\n                contract.getTransaction()?.getTransactionLink() || "";\\n            const contractAddress = contract.getContractAddress();\\n            await csvWriter.writeRecords([\\n                [\\n                    deploymentDetails.contractType,\\n                    name,\\n                    symbol,\\n                    network,\\n                    contractAddress,\\n                    transaction,\\n                    deploymentDetails.baseURI,\\n                    deploymentDetails.totalSupply || "",\\n                ],\\n            ]);\\n\\n            callback(\\n                {\\n                    text: `Token contract deployed successfully:\\n- Type: ${deploymentDetails.contractType}\\n- Name: ${name}\\n- Symbol: ${symbol}\\n- Network: ${network}\\n- Contract Address: ${contractAddress}\\n- Transaction URL: ${transaction}\\n${deploymentDetails.baseURI !== "N/A" ? `- Base URI: ${deploymentDetails.baseURI}` : ""}\\n${deploymentDetails.totalSupply !== "N/A" ? `- Total Supply: ${deploymentDetails.totalSupply}` : ""}\\n\\nContract deployment has been logged to the CSV file.`,\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error deploying token contract:", error);\\n            callback(\\n                {\\n                    text: "Failed to deploy token contract. Please check the logs for more details.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Deploy an ERC721 token named \'MyNFT\' with symbol \'MNFT\' on base network with URI \'https://pbs.twimg.com/profile_images/1848823420336934913/oI0-xNGe_400x400.jpg\'",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Token contract deployed successfully:\\n- Type: ERC20\\n- Name: MyToken\\n- Symbol: MTK\\n- Network: base\\n- Contract Address: 0x...\\n- Transaction URL: https://basescan.org/tx/...\\n- Total Supply: 1000000`,\\n                },\\n            },\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Deploy an ERC721 token named \'MyNFT\' with symbol \'MNFT\' on the base network",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Token contract deployed successfully:\\n- Type: ERC721\\n- Name: MyNFT\\n- Symbol: MNFT\\n- Network: base\\n- Contract Address: 0x...\\n- Transaction URL: https://basescan.org/tx/...\\n- URI: https://pbs.twimg.com/profile_images/1848823420336934913/oI0-xNGe_400x400.jpg`,\\n                },\\n            },\\n        ],\\n    ],\\n    similes: ["DEPLOY_CONTRACT", "CREATE_TOKEN", "MINT_TOKEN", "CREATE_NFT"],\\n};\\n\\n// Add to tokenContract.ts\\nexport const invokeContractAction: Action = {\\n    name: "INVOKE_CONTRACT",\\n    description:\\n        "Invoke a method on a deployed smart contract using the Coinbase SDK",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime for INVOKE_CONTRACT...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting INVOKE_CONTRACT handler...");\\n\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            const context = composeContext({\\n                state,\\n                template: contractInvocationTemplate,\\n            });\\n\\n            const invocationDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.LARGE,\\n                schema: ContractInvocationSchema,\\n            });\\n            elizaLogger.info("Invocation details:", invocationDetails.object);\\n            if (!isContractInvocationContent(invocationDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid contract invocation details. Please check the inputs.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const {\\n                contractAddress,\\n                method,\\n                args,\\n                amount,\\n                assetId,\\n                networkId,\\n            } = invocationDetails.object;\\n            const wallet = await initializeWallet(runtime, networkId);\\n\\n            // Prepare invocation options\\n            const invocationOptions = {\\n                contractAddress,\\n                method,\\n                abi: ABI,\\n                args: {\\n                    ...args,\\n                    amount: args.amount || amount, // Ensure amount is passed in args\\n                },\\n                networkId,\\n                assetId,\\n            };\\n            elizaLogger.info("Invocation options:", invocationOptions);\\n            // Invoke the contract\\n            const invocation = await wallet.invokeContract(invocationOptions);\\n\\n            // Wait for the transaction to be mined\\n            await invocation.wait();\\n\\n            // Log the invocation to CSV\\n            const csvWriter = createArrayCsvWriter({\\n                path: contractsCsvFilePath,\\n                header: [\\n                    "Contract Address",\\n                    "Method",\\n                    "Network",\\n                    "Status",\\n                    "Transaction URL",\\n                    "Amount",\\n                    "Asset ID",\\n                ],\\n                append: true,\\n            });\\n\\n            await csvWriter.writeRecords([\\n                [\\n                    contractAddress,\\n                    method,\\n                    networkId,\\n                    invocation.getStatus(),\\n                    invocation.getTransactionLink() || "",\\n                    amount || "",\\n                    assetId || "",\\n                ],\\n            ]);\\n\\n            callback(\\n                {\\n                    text: `Contract method invoked successfully:\\n- Contract Address: ${contractAddress}\\n- Method: ${method}\\n- Network: ${networkId}\\n- Status: ${invocation.getStatus()}\\n- Transaction URL: ${invocation.getTransactionLink() || "N/A"}\\n${amount ? `- Amount: ${amount}` : ""}\\n${assetId ? `- Asset ID: ${assetId}` : ""}\\n\\nContract invocation has been logged to the CSV file.`,\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error invoking contract method:", error);\\n            callback(\\n                {\\n                    text: "Failed to invoke contract method. Please check the logs for more details.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Call the \'transfer\' method on my ERC20 token contract at 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 with amount 100 to recepient 0xbcF7C64B880FA89a015970dC104E848d485f99A3",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Contract method invoked successfully:\\n- Contract Address: 0x123...\\n- Method: transfer\\n- Network: base\\n- Status: SUCCESS\\n- Transaction URL: https://basescan.org/tx/...\\n- Amount: 100\\n- Asset ID: wei\\n\\nContract invocation has been logged to the CSV file.`,\\n                },\\n            },\\n        ],\\n    ],\\n    similes: ["CALL_CONTRACT", "EXECUTE_CONTRACT", "INTERACT_WITH_CONTRACT"],\\n};\\n\\nexport const readContractAction: Action = {\\n    name: "READ_CONTRACT",\\n    description:\\n        "Read data from a deployed smart contract using the Coinbase SDK",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime for READ_CONTRACT...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting READ_CONTRACT handler...");\\n\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            const context = composeContext({\\n                state,\\n                template: readContractTemplate,\\n            });\\n\\n            const readDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.SMALL,\\n                schema: ReadContractSchema,\\n            });\\n\\n            if (!isReadContractContent(readDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid contract read details. Please check the inputs.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const { contractAddress, method, args, networkId, abi } =\\n                readDetails.object;\\n            elizaLogger.info("Reading contract:", {\\n                contractAddress,\\n                method,\\n                args,\\n                networkId,\\n                abi,\\n            });\\n\\n            const result = await readContract({\\n                networkId,\\n                contractAddress,\\n                method,\\n                args,\\n                abi: ABI as any,\\n            });\\n\\n            // Serialize the result before using it\\n            const serializedResult = serializeBigInt(result);\\n\\n            elizaLogger.info("Contract read result:", serializedResult);\\n\\n            callback(\\n                {\\n                    text: `Contract read successful:\\n- Contract Address: ${contractAddress}\\n- Method: ${method}\\n- Network: ${networkId}\\n- Result: ${JSON.stringify(serializedResult, null, 2)}`,\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error reading contract:", error);\\n            callback(\\n                {\\n                    text: `Failed to read contract: ${error instanceof Error ? error.message : "Unknown error"}`,\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Read the balance of address 0xbcF7C64B880FA89a015970dC104E848d485f99A3 from the ERC20 contract at 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on eth",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Contract read successful:\\n- Contract Address: 0x37f2131ebbc8f97717edc3456879ef56b9f4b97b\\n- Method: balanceOf\\n- Network: eth\\n- Result: "1000000"`,\\n                },\\n            },\\n        ],\\n    ],\\n    similes: ["READ_CONTRACT", "GET_CONTRACT_DATA", "QUERY_CONTRACT"],\\n};\\n\\nexport const tokenContractPlugin: Plugin = {\\n    name: "tokenContract",\\n    description:\\n        "Enables deployment, invocation, and reading of ERC20, ERC721, and ERC1155 token contracts using the Coinbase SDK",\\n    actions: [\\n        deployTokenContractAction,\\n        invokeContractAction,\\n        readContractAction,\\n    ],\\n};\\n',
                hash: "2d173e104abd800666e199866b1ac5eee73b7edef81eb713a805e7d47a7d5192",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/plugins/tokenContract.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "c0dfe298-8089-0ddb-a727-d92cb3b03281",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";\\nimport {\\n    composeContext,\\n    elizaLogger,\\n    generateObject,\\n    ModelClass,\\n    Action,\\n    IAgentRuntime,\\n    Memory,\\n    Provider,\\n    State,\\n    HandlerCallback,\\n    Plugin,\\n} from "@elizaos/core";\\nimport {\\n    TransferSchema,\\n    isTransferContent,\\n    TransferContent,\\n    Transaction,\\n} from "../types";\\nimport { transferTemplate } from "../templates";\\nimport { readFile } from "fs/promises";\\nimport { parse } from "csv-parse/sync";\\nimport path from "path";\\nimport { fileURLToPath } from "url";\\nimport fs from "fs";\\nimport { createArrayCsvWriter } from "csv-writer";\\nimport {\\n    appendTransactionsToCsv,\\n    executeTransfer,\\n    getCharityAddress,\\n    getWalletDetails,\\n    initializeWallet,\\n} from "../utils";\\n\\n// Dynamically resolve the file path to the src/plugins directory\\nconst __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);\\nconst baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");\\nconst csvFilePath = path.join(baseDir, "transactions.csv");\\n\\nexport const massPayoutProvider: Provider = {\\n    get: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.debug("Starting massPayoutProvider.get function");\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n            elizaLogger.info("Reading CSV file from:", csvFilePath);\\n\\n            // Ensure the CSV file exists\\n            if (!fs.existsSync(csvFilePath)) {\\n                elizaLogger.warn("CSV file not found. Creating a new one.");\\n                const csvWriter = createArrayCsvWriter({\\n                    path: csvFilePath,\\n                    header: [\\n                        "Address",\\n                        "Amount",\\n                        "Status",\\n                        "Error Code",\\n                        "Transaction URL",\\n                    ],\\n                });\\n                await csvWriter.writeRecords([]); // Create an empty file with headers\\n                elizaLogger.info("New CSV file created with headers.");\\n            }\\n\\n            // Read and parse the CSV file\\n            const csvData = await readFile(csvFilePath, "utf-8");\\n            const records = parse(csvData, {\\n                columns: true,\\n                skip_empty_lines: true,\\n            });\\n\\n            const { balances, transactions } = await getWalletDetails(runtime);\\n\\n            elizaLogger.info("Parsed CSV records:", records);\\n            elizaLogger.info("Current Balances:", balances);\\n            elizaLogger.info("Last Transactions:", transactions);\\n\\n            return {\\n                currentTransactions: records.map((record: any) => ({\\n                    address: record["Address"] || undefined,\\n                    amount: parseFloat(record["Amount"]) || undefined,\\n                    status: record["Status"] || undefined,\\n                    errorCode: record["Error Code"] || "",\\n                    transactionUrl: record["Transaction URL"] || "",\\n                })),\\n                balances,\\n                transactionHistory: transactions,\\n            };\\n        } catch (error) {\\n            elizaLogger.error("Error in massPayoutProvider:", error);\\n            return { csvRecords: [], balances: [], transactions: [] };\\n        }\\n    },\\n};\\n\\nasync function executeMassPayout(\\n    runtime: IAgentRuntime,\\n    networkId: string,\\n    receivingAddresses: string[],\\n    transferAmount: number,\\n    assetId: string\\n): Promise<Transaction[]> {\\n    elizaLogger.debug("Starting executeMassPayout function");\\n    const transactions: Transaction[] = [];\\n    const assetIdLowercase = assetId.toLowerCase();\\n    let sendingWallet: Wallet;\\n    try {\\n        elizaLogger.debug("Initializing sending wallet");\\n        sendingWallet = await initializeWallet(runtime, networkId);\\n    } catch (error) {\\n        elizaLogger.error("Error initializing sending wallet:", error);\\n        throw error;\\n    }\\n    for (const address of receivingAddresses) {\\n        elizaLogger.info("Processing payout for address:", address);\\n        if (address) {\\n            try {\\n                // Check balance before initiating transfer\\n\\n                const walletBalance =\\n                    await sendingWallet.getBalance(assetIdLowercase);\\n\\n                elizaLogger.info("Wallet balance for asset:", {\\n                    assetId,\\n                    walletBalance,\\n                });\\n\\n                if (walletBalance.lessThan(transferAmount)) {\\n                    const insufficientFunds = `Insufficient funds for address ${sendingWallet.getDefaultAddress()} to send to ${address}. Required: ${transferAmount}, Available: ${walletBalance}`;\\n                    elizaLogger.error(insufficientFunds);\\n\\n                    transactions.push({\\n                        address,\\n                        amount: transferAmount,\\n                        status: "Failed",\\n                        errorCode: insufficientFunds,\\n                        transactionUrl: null,\\n                    });\\n                    continue;\\n                }\\n\\n                // Execute the transfer\\n                const transfer = await executeTransfer(\\n                    sendingWallet,\\n                    transferAmount,\\n                    assetIdLowercase,\\n                    address\\n                );\\n\\n                transactions.push({\\n                    address,\\n                    amount: transfer.getAmount().toNumber(),\\n                    status: "Success",\\n                    errorCode: null,\\n                    transactionUrl: transfer.getTransactionLink(),\\n                });\\n            } catch (error) {\\n                elizaLogger.error(\\n                    "Error during transfer for address:",\\n                    address,\\n                    error\\n                );\\n                transactions.push({\\n                    address,\\n                    amount: transferAmount,\\n                    status: "Failed",\\n                    errorCode: error?.code || "Unknown Error",\\n                    transactionUrl: null,\\n                });\\n            }\\n        } else {\\n            elizaLogger.info("Skipping invalid or empty address.");\\n            transactions.push({\\n                address: "Invalid or Empty",\\n                amount: transferAmount,\\n                status: "Failed",\\n                errorCode: "Invalid Address",\\n                transactionUrl: null,\\n            });\\n        }\\n    }\\n    // Send 1% to charity\\n    const charityAddress = getCharityAddress(networkId);\\n\\n    try {\\n        elizaLogger.debug("Sending 1% to charity:", charityAddress);\\n        const charityTransfer = await executeTransfer(\\n            sendingWallet,\\n            transferAmount * 0.01,\\n            assetId,\\n            charityAddress\\n        );\\n\\n        transactions.push({\\n            address: charityAddress,\\n            amount: charityTransfer.getAmount().toNumber(),\\n            status: "Success",\\n            errorCode: null,\\n            transactionUrl: charityTransfer.getTransactionLink(),\\n        });\\n    } catch (error) {\\n        elizaLogger.error("Error during charity transfer:", error);\\n        transactions.push({\\n            address: charityAddress,\\n            amount: transferAmount * 0.01,\\n            status: "Failed",\\n            errorCode: error?.message || "Unknown Error",\\n            transactionUrl: null,\\n        });\\n    }\\n    await appendTransactionsToCsv(transactions);\\n    elizaLogger.info("Finished processing mass payouts.");\\n    return transactions;\\n}\\n\\n// Action for sending mass payouts\\nexport const sendMassPayoutAction: Action = {\\n    name: "SEND_MASS_PAYOUT",\\n    similes: ["BULK_TRANSFER", "DISTRIBUTE_FUNDS", "SEND_PAYMENTS"],\\n    description:\\n        "Sends mass payouts to a list of receiving addresses using a predefined sending wallet and logs all transactions to a CSV file.",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime and message...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting SEND_MASS_PAYOUT handler...");\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n            if (!state) {\\n                state = (await runtime.composeState(message, {\\n                    providers: [massPayoutProvider],\\n                })) as State;\\n            } else {\\n                state = await runtime.updateRecentMessageState(state);\\n            }\\n\\n            const context = composeContext({\\n                state,\\n                template: transferTemplate,\\n            });\\n\\n            const transferDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.LARGE,\\n                schema: TransferSchema,\\n            });\\n\\n            elizaLogger.info(\\n                "Transfer details generated:",\\n                transferDetails.object\\n            );\\n\\n            if (!isTransferContent(transferDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid transfer details. Please check the inputs.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const { receivingAddresses, transferAmount, assetId, network } =\\n                transferDetails.object as TransferContent;\\n\\n            const allowedNetworks = Object.values(Coinbase.networks);\\n\\n            if (\\n                !network ||\\n                !allowedNetworks.includes(network.toLowerCase() as any) ||\\n                !receivingAddresses?.length ||\\n                transferAmount <= 0 ||\\n                !assetId\\n            ) {\\n                elizaLogger.error("Missing or invalid input parameters:", {\\n                    network,\\n                    receivingAddresses,\\n                    transferAmount,\\n                    assetId,\\n                });\\n                callback(\\n                    {\\n                        text: `Invalid input parameters. Please ensure:\\n- Network is one of: ${allowedNetworks.join(", ")}.\\n- Receiving addresses are provided.\\n- Transfer amount is greater than zero.\\n- Asset ID is valid.`,\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            elizaLogger.info("◎ Starting mass payout...");\\n            const transactions = await executeMassPayout(\\n                runtime,\\n                network,\\n                receivingAddresses,\\n                transferAmount,\\n                assetId\\n            );\\n\\n            const successTransactions = transactions.filter(\\n                (tx) => tx.status === "Success"\\n            );\\n            const failedTransactions = transactions.filter(\\n                (tx) => tx.status === "Failed"\\n            );\\n            const successDetails = successTransactions\\n                .map(\\n                    (tx) =>\\n                        `Address: ${tx.address}, Amount: ${tx.amount}, Transaction URL: ${\\n                            tx.transactionUrl || "N/A"\\n                        }`\\n                )\\n                .join("\\n");\\n            const failedDetails = failedTransactions\\n                .map(\\n                    (tx) =>\\n                        `Address: ${tx.address}, Amount: ${tx.amount}, Error Code: ${\\n                            tx.errorCode || "Unknown Error"\\n                        }`\\n                )\\n                .join("\\n");\\n            const charityTransactions = transactions.filter(\\n                (tx) => tx.address === getCharityAddress(network)\\n            );\\n            const charityDetails = charityTransactions\\n                .map(\\n                    (tx) =>\\n                        `Address: ${tx.address}, Amount: ${tx.amount}, Transaction URL: ${\\n                            tx.transactionUrl || "N/A"\\n                        }`\\n                )\\n                .join("\\n");\\n            callback(\\n                {\\n                    text: `Mass payouts completed successfully.\\n- Successful Transactions: ${successTransactions.length}\\n- Failed Transactions: ${failedTransactions.length}\\n\\nDetails:\\n${successTransactions.length > 0 ? `✅ Successful Transactions:\\n${successDetails}` : "No successful transactions."}\\n${failedTransactions.length > 0 ? `❌ Failed Transactions:\\n${failedDetails}` : "No failed transactions."}\\n${charityTransactions.length > 0 ? `✅ Charity Transactions:\\n${charityDetails}` : "No charity transactions."}\\n\\nCheck the CSV file for full details.`,\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error during mass payouts:", error);\\n            callback(\\n                { text: "Failed to complete payouts. Please try again." },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Distribute 0.0001 ETH on base to 0xA0ba2ACB5846A54834173fB0DD9444F756810f06 and 0xF14F2c49aa90BaFA223EE074C1C33b59891826bF",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Mass payouts completed successfully.\\n- Successful Transactions: {{2}}\\n- Failed Transactions: {{1}}\\n\\nDetails:\\n✅ Successful Transactions:\\nAddress: 0xABC123..., Amount: 0.005, Transaction URL: https://etherscan.io/tx/...\\nAddress: 0xDEF456..., Amount: 0.005, Transaction URL: https://etherscan.io/tx/...\\n\\n❌ Failed Transactions:\\nAddress: 0xGHI789..., Amount: 0.005, Error Code: Insufficient Funds\\n\\nCheck the CSV file for full details.`,\\n                    action: "SEND_MASS_PAYOUT",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Airdrop 10 USDC to these community members: 0x789..., 0x101... on base network",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Mass payout completed successfully:\\n- Airdropped 10 USDC to 2 addresses on base network\\n- Successful Transactions: 2\\n- Failed Transactions: 0\\nCheck the CSV file for transaction details.",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Multi-send 0.25 ETH to team wallets: 0x222..., 0x333... on Ethereum",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Mass payout completed successfully:\\n- Multi-sent 0.25 ETH to 2 addresses on Ethereum network\\n- Successful Transactions: 2\\n- Failed Transactions: 0\\nCheck the CSV file for transaction details.",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Distribute rewards of 5 SOL each to contest winners: winner1.sol, winner2.sol on Solana",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Mass payout completed successfully:\\n- Distributed 5 SOL to 2 addresses on Solana network\\n- Successful Transactions: 2\\n- Failed Transactions: 0\\nCheck the CSV file for transaction details.",\\n                },\\n            },\\n        ],\\n    ],\\n};\\n\\nexport const coinbaseMassPaymentsPlugin: Plugin = {\\n    name: "automatedPayments",\\n    description:\\n        "Processes mass payouts using Coinbase SDK and logs all transactions (success and failure) to a CSV file. Provides dynamic transaction data through a provider.",\\n    actions: [sendMassPayoutAction],\\n    providers: [massPayoutProvider],\\n};\\n',
                hash: "af590857fd0e2ae1648ad1a5454791137b14fbd71c6c2bde3e4a16ed975638f4",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/plugins/massPayments.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "e7ac7854-751a-073b-9d0d-692e5fcf2814",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import {\\n    composeContext,\\n    elizaLogger,\\n    generateObject,\\n    ModelClass,\\n    Provider,\\n} from "@elizaos/core";\\nimport {\\n    Action,\\n    HandlerCallback,\\n    IAgentRuntime,\\n    Memory,\\n    Plugin,\\n    State,\\n} from "@elizaos/core";\\nimport { ChargeContent, ChargeSchema, isChargeContent } from "../types";\\nimport { chargeTemplate, getChargeTemplate } from "../templates";\\nimport { getWalletDetails } from "../utils";\\nimport { Coinbase } from "@coinbase/coinbase-sdk";\\n\\nconst url = "https://api.commerce.coinbase.com/charges";\\ninterface ChargeRequest {\\n    name: string;\\n    description: string;\\n    pricing_type: string;\\n    local_price: {\\n        amount: string;\\n        currency: string;\\n    };\\n}\\n\\nexport async function createCharge(apiKey: string, params: ChargeRequest) {\\n    elizaLogger.debug("Starting createCharge function");\\n    try {\\n        const response = await fetch(url, {\\n            method: "POST",\\n            headers: {\\n                "Content-Type": "application/json",\\n                "X-CC-Api-Key": apiKey,\\n            },\\n            body: JSON.stringify(params),\\n        });\\n\\n        if (!response.ok) {\\n            throw new Error(`Failed to create charge: ${response.statusText}`);\\n        }\\n\\n        const data = await response.json();\\n        return data.data;\\n    } catch (error) {\\n        elizaLogger.error("Error creating charge:", error);\\n        throw error;\\n    }\\n}\\n\\n// Function to fetch all charges\\nexport async function getAllCharges(apiKey: string) {\\n    elizaLogger.debug("Starting getAllCharges function");\\n    try {\\n        const response = await fetch(url, {\\n            method: "GET",\\n            headers: {\\n                "Content-Type": "application/json",\\n                "X-CC-Api-Key": apiKey,\\n            },\\n        });\\n\\n        if (!response.ok) {\\n            throw new Error(\\n                `Failed to fetch all charges: ${response.statusText}`\\n            );\\n        }\\n\\n        const data = await response.json();\\n        return data.data;\\n    } catch (error) {\\n        elizaLogger.error("Error fetching charges:", error);\\n        throw error;\\n    }\\n}\\n\\n// Function to fetch details of a specific charge\\nexport async function getChargeDetails(apiKey: string, chargeId: string) {\\n    elizaLogger.debug("Starting getChargeDetails function");\\n    const getUrl = `${url}${chargeId}`;\\n\\n    try {\\n        const response = await fetch(getUrl, {\\n            method: "GET",\\n            headers: {\\n                "Content-Type": "application/json",\\n                "X-CC-Api-Key": apiKey,\\n            },\\n        });\\n\\n        if (!response.ok) {\\n            throw new Error(\\n                `Failed to fetch charge details: ${response.statusText}`\\n            );\\n        }\\n\\n        const data = await response.json();\\n        return data;\\n    } catch (error) {\\n        elizaLogger.error(\\n            `Error fetching charge details for ID ${chargeId}:`,\\n            error\\n        );\\n        throw error;\\n    }\\n}\\n\\nexport const createCoinbaseChargeAction: Action = {\\n    name: "CREATE_CHARGE",\\n    similes: [\\n        "MAKE_CHARGE",\\n        "INITIATE_CHARGE",\\n        "GENERATE_CHARGE",\\n        "CREATE_TRANSACTION",\\n        "COINBASE_CHARGE",\\n        "GENERATE_INVOICE",\\n        "CREATE_PAYMENT",\\n        "SETUP_BILLING",\\n        "REQUEST_PAYMENT",\\n        "CREATE_CHECKOUT",\\n        "GET_CHARGE_STATUS",\\n        "LIST_CHARGES",\\n    ],\\n    description:\\n        "Create and manage payment charges using Coinbase Commerce. Supports fixed and dynamic pricing, multiple currencies (USD, EUR, USDC), and provides charge status tracking and management features.",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        const coinbaseCommerceKeyOk = !!runtime.getSetting(\\n            "COINBASE_COMMERCE_KEY"\\n        );\\n\\n        // Ensure Coinbase Commerce API key is available\\n        return coinbaseCommerceKeyOk;\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.info("Composing state for message:", message);\\n        if (!state) {\\n            state = (await runtime.composeState(message)) as State;\\n        } else {\\n            state = await runtime.updateRecentMessageState(state);\\n        }\\n\\n        const context = composeContext({\\n            state,\\n            template: chargeTemplate,\\n        });\\n\\n        const chargeDetails = await generateObject({\\n            runtime,\\n            context,\\n            modelClass: ModelClass.LARGE,\\n            schema: ChargeSchema,\\n        });\\n        if (!isChargeContent(chargeDetails.object)) {\\n            throw new Error("Invalid content");\\n        }\\n        const charge = chargeDetails.object as ChargeContent;\\n        if (!charge || !charge.price || !charge.type) {\\n            callback(\\n                {\\n                    text: "Invalid charge details provided.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        elizaLogger.info("Charge details received:", chargeDetails);\\n\\n        // Initialize Coinbase Commerce client\\n        elizaLogger.debug("Starting Coinbase Commerce client initialization");\\n        try {\\n            // Create a charge\\n            const chargeResponse = await createCharge(\\n                runtime.getSetting("COINBASE_COMMERCE_KEY"),\\n                {\\n                    local_price: {\\n                        amount: charge.price.toString(),\\n                        currency: charge.currency,\\n                    },\\n                    pricing_type: charge.type,\\n                    name: charge.name,\\n                    description: charge.description,\\n                }\\n            );\\n\\n            elizaLogger.info(\\n                "Coinbase Commerce charge created:",\\n                chargeResponse\\n            );\\n\\n            callback(\\n                {\\n                    text: `Charge created successfully: ${chargeResponse.hosted_url}`,\\n                    attachments: [\\n                        {\\n                            id: crypto.randomUUID(),\\n                            url: chargeResponse.id,\\n                            title: "Coinbase Commerce Charge",\\n                            description: `Charge ID: ${chargeResponse.id}`,\\n                            text: `Pay here: ${chargeResponse.hosted_url}`,\\n                            source: "coinbase",\\n                        },\\n                    ],\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error(\\n                "Error creating Coinbase Commerce charge:",\\n                error\\n            );\\n            callback(\\n                {\\n                    text: "Failed to create a charge. Please try again.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Create a charge for $100 USD for Digital Art NFT with description \'Exclusive digital artwork collection\'",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Charge created successfully:\\n- Amount: $100 USD\\n- Name: Digital Art NFT\\n- Description: Exclusive digital artwork collection\\n- Type: fixed_price\\n- Charge URL: https://commerce.coinbase.com/charges/...",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Set up a dynamic price charge for Premium Membership named \'VIP Access Pass\'",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Charge created successfully:\\n- Type: dynamic_price\\n- Name: VIP Access Pass\\n- Description: Premium Membership\\n- Charge URL: https://commerce.coinbase.com/charges/...",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Generate a payment request for 50 EUR for Workshop Registration",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Charge created successfully:\\n- Amount: 50 EUR\\n- Name: Workshop Registration\\n- Type: fixed_price\\n- Charge URL: https://commerce.coinbase.com/charges/...",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Create an invoice for 1000 USDC for Consulting Services",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Charge created successfully:\\n- Amount: 1000 USDC\\n- Name: Consulting Services\\n- Type: fixed_price\\n- Charge URL: https://commerce.coinbase.com/charges/...",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Check the status of charge abc-123-def",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Charge details retrieved:\\n- ID: abc-123-def\\n- Status: COMPLETED\\n- Amount: 100 USD\\n- Created: 2024-01-20T10:00:00Z\\n- Expires: 2024-01-21T10:00:00Z",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "List all active charges",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Active charges retrieved:\\n1. ID: abc-123 - $100 USD - Digital Art NFT\\n2. ID: def-456 - 50 EUR - Workshop\\n3. ID: ghi-789 - 1000 USDC - Consulting\\n\\nTotal active charges: 3",\\n                },\\n            },\\n        ],\\n    ],\\n} as Action;\\n\\nexport const getAllChargesAction: Action = {\\n    name: "GET_ALL_CHARGES",\\n    similes: ["FETCH_ALL_CHARGES", "RETRIEVE_ALL_CHARGES", "LIST_ALL_CHARGES"],\\n    description: "Fetch all charges using Coinbase Commerce.",\\n    validate: async (runtime: IAgentRuntime) => {\\n        const coinbaseCommerceKeyOk = !!runtime.getSetting(\\n            "COINBASE_COMMERCE_KEY"\\n        );\\n\\n        // Ensure Coinbase Commerce API key is available\\n        return coinbaseCommerceKeyOk;\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        try {\\n            elizaLogger.info("Composing state for message:", message);\\n            if (!state) {\\n                state = (await runtime.composeState(message)) as State;\\n            } else {\\n                state = await runtime.updateRecentMessageState(state);\\n            }\\n            const charges = await getAllCharges(\\n                runtime.getSetting("COINBASE_COMMERCE_KEY")\\n            );\\n\\n            elizaLogger.info("Fetched all charges:", charges);\\n\\n            callback(\\n                {\\n                    text: `Successfully fetched all charges. Total charges: ${charges.length}`,\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error fetching all charges:", error);\\n            callback(\\n                {\\n                    text: "Failed to fetch all charges. Please try again.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: { text: "Fetch all charges" },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Successfully fetched all charges.",\\n                    action: "GET_ALL_CHARGES",\\n                },\\n            },\\n        ],\\n    ],\\n} as Action;\\n\\nexport const getChargeDetailsAction: Action = {\\n    name: "GET_CHARGE_DETAILS",\\n    similes: ["FETCH_CHARGE_DETAILS", "RETRIEVE_CHARGE_DETAILS", "GET_CHARGE"],\\n    description: "Fetch details of a specific charge using Coinbase Commerce.",\\n    validate: async (runtime: IAgentRuntime) => {\\n        const coinbaseCommerceKeyOk = !!runtime.getSetting(\\n            "COINBASE_COMMERCE_KEY"\\n        );\\n\\n        // Ensure Coinbase Commerce API key is available\\n        return coinbaseCommerceKeyOk;\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.info("Composing state for message:", message);\\n        if (!state) {\\n            state = (await runtime.composeState(message)) as State;\\n        } else {\\n            state = await runtime.updateRecentMessageState(state);\\n        }\\n\\n        const context = composeContext({\\n            state,\\n            template: getChargeTemplate,\\n        });\\n        const chargeDetails = await generateObject({\\n            runtime,\\n            context,\\n            modelClass: ModelClass.LARGE,\\n            schema: ChargeSchema,\\n        });\\n        if (!isChargeContent(chargeDetails.object)) {\\n            throw new Error("Invalid content");\\n        }\\n        const charge = chargeDetails.object as ChargeContent;\\n        if (!charge.id) {\\n            callback(\\n                {\\n                    text: "Missing charge ID. Please provide a valid charge ID.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        try {\\n            const chargeDetails = await getChargeDetails(\\n                runtime.getSetting("COINBASE_COMMERCE_KEY"),\\n                charge.id\\n            );\\n\\n            elizaLogger.info("Fetched charge details:", chargeDetails);\\n\\n            callback(\\n                {\\n                    text: `Successfully fetched charge details for ID: ${charge.id}`,\\n                    attachments: [\\n                        {\\n                            id: crypto.randomUUID(),\\n                            url: chargeDetails.hosted_url,\\n                            title: `Charge Details for ${charge.id}`,\\n                            description: `Details: ${JSON.stringify(chargeDetails, null, 2)}`,\\n                            source: "coinbase",\\n                            text: "",\\n                        },\\n                    ],\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error(\\n                `Error fetching details for charge ID ${charge.id}:`,\\n                error\\n            );\\n            callback(\\n                {\\n                    text: `Failed to fetch details for charge ID: ${charge.id}. Please try again.`,\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Fetch details of charge ID: 123456",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Successfully fetched charge details. {{charge.id}} for {{charge.amount}} {{charge.currency}} to {{charge.name}} for {{charge.description}}",\\n                    action: "GET_CHARGE_DETAILS",\\n                },\\n            },\\n        ],\\n    ],\\n};\\n\\nexport const chargeProvider: Provider = {\\n    get: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.debug("Starting chargeProvider.get function");\\n        const charges = await getAllCharges(\\n            runtime.getSetting("COINBASE_COMMERCE_KEY")\\n        );\\n        // Ensure API key is available\\n        const coinbaseAPIKey =\\n            runtime.getSetting("COINBASE_API_KEY") ??\\n            process.env.COINBASE_API_KEY;\\n        const coinbasePrivateKey =\\n            runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n            process.env.COINBASE_PRIVATE_KEY;\\n        const balances = [];\\n        const transactions = [];\\n        if (coinbaseAPIKey && coinbasePrivateKey) {\\n            Coinbase.configure({\\n                apiKeyName: coinbaseAPIKey,\\n                privateKey: coinbasePrivateKey,\\n            });\\n            const { balances, transactions } = await getWalletDetails(runtime);\\n            elizaLogger.info("Current Balances:", balances);\\n            elizaLogger.info("Last Transactions:", transactions);\\n        }\\n        const formattedCharges = charges.map((charge) => ({\\n            id: charge.id,\\n            name: charge.name,\\n            description: charge.description,\\n            pricing: charge.pricing,\\n        }));\\n        elizaLogger.info("Charges:", formattedCharges);\\n        return { charges: formattedCharges, balances, transactions };\\n    },\\n};\\n\\nexport const coinbaseCommercePlugin: Plugin = {\\n    name: "coinbaseCommerce",\\n    description:\\n        "Integration with Coinbase Commerce for creating and managing charges.",\\n    actions: [\\n        createCoinbaseChargeAction,\\n        getAllChargesAction,\\n        getChargeDetailsAction,\\n    ],\\n    evaluators: [],\\n    providers: [chargeProvider],\\n};\\n',
                hash: "4bcda6d54d73c72965ce3cbb7a1dd618cf1e7461bf0b0c2c1aaf889127eed397",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/plugins/commerce.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "b43b992e-db67-0181-a40f-b30a0d156afd",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: 'import { RESTClient } from "../../advanced-sdk-ts/src/rest";\\nimport {\\n    Action,\\n    Plugin,\\n    elizaLogger,\\n    IAgentRuntime,\\n    Memory,\\n    HandlerCallback,\\n    State,\\n    composeContext,\\n    generateObject,\\n    ModelClass,\\n    Provider,\\n} from "@elizaos/core";\\nimport { advancedTradeTemplate } from "../templates";\\nimport { isAdvancedTradeContent, AdvancedTradeSchema } from "../types";\\nimport { readFile } from "fs/promises";\\nimport { parse } from "csv-parse/sync";\\nimport path from "path";\\nimport { fileURLToPath } from "url";\\nimport fs from "fs";\\nimport { createArrayCsvWriter } from "csv-writer";\\nimport {\\n    OrderSide,\\n    OrderConfiguration,\\n} from "../../advanced-sdk-ts/src/rest/types/common-types";\\nimport { CreateOrderResponse } from "../../advanced-sdk-ts/src/rest/types/orders-types";\\n\\n// File path setup remains the same\\nconst __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);\\nconst baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");\\nconst tradeCsvFilePath = path.join(baseDir, "advanced_trades.csv");\\n\\nconst tradeProvider: Provider = {\\n    get: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.debug("Starting tradeProvider function");\\n        try {\\n            const client = new RESTClient(\\n                runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY\\n            );\\n\\n            // Get accounts and products information\\n            let accounts, products;\\n            try {\\n                accounts = await client.listAccounts({});\\n            } catch (error) {\\n                elizaLogger.error("Error fetching accounts:", error);\\n                return [];\\n            }\\n\\n            try {\\n                products = await client.listProducts({});\\n            } catch (error) {\\n                elizaLogger.error("Error fetching products:", error);\\n                return [];\\n            }\\n\\n            // Read CSV file logic remains the same\\n            if (!fs.existsSync(tradeCsvFilePath)) {\\n                const csvWriter = createArrayCsvWriter({\\n                    path: tradeCsvFilePath,\\n                    header: [\\n                        "Order ID",\\n                        "Success",\\n                        "Order Configuration",\\n                        "Response",\\n                    ],\\n                });\\n                await csvWriter.writeRecords([]);\\n            }\\n\\n            let csvData, records;\\n            try {\\n                csvData = await readFile(tradeCsvFilePath, "utf-8");\\n            } catch (error) {\\n                elizaLogger.error("Error reading CSV file:", error);\\n                return [];\\n            }\\n\\n            try {\\n                records = parse(csvData, {\\n                    columns: true,\\n                    skip_empty_lines: true,\\n                });\\n            } catch (error) {\\n                elizaLogger.error("Error parsing CSV data:", error);\\n                return [];\\n            }\\n\\n            return {\\n                accounts: accounts.accounts,\\n                products: products.products,\\n                trades: records,\\n            };\\n        } catch (error) {\\n            elizaLogger.error("Error in tradeProvider:", error);\\n            return [];\\n        }\\n    },\\n};\\n\\nexport async function appendTradeToCsv(tradeResult: any) {\\n    elizaLogger.debug("Starting appendTradeToCsv function");\\n    try {\\n        const csvWriter = createArrayCsvWriter({\\n            path: tradeCsvFilePath,\\n            header: ["Order ID", "Success", "Order Configuration", "Response"],\\n            append: true,\\n        });\\n        elizaLogger.info("Trade result:", tradeResult);\\n\\n        // Format trade data based on success/failure\\n        const formattedTrade = [\\n            tradeResult.success_response?.order_id ||\\n                tradeResult.failure_response?.order_id ||\\n                "",\\n            tradeResult.success,\\n            // JSON.stringify(tradeResult.order_configuration || {}),\\n            // JSON.stringify(tradeResult.success_response || tradeResult.failure_response || {})\\n        ];\\n\\n        elizaLogger.info("Formatted trade for CSV:", formattedTrade);\\n        await csvWriter.writeRecords([formattedTrade]);\\n        elizaLogger.info("Trade written to CSV successfully");\\n    } catch (error) {\\n        elizaLogger.error("Error writing trade to CSV:", error);\\n        // Log the actual error for debugging\\n        if (error instanceof Error) {\\n            elizaLogger.error("Error details:", error.message);\\n        }\\n    }\\n}\\n\\nasync function hasEnoughBalance(\\n    client: RESTClient,\\n    currency: string,\\n    amount: number,\\n    side: string\\n): Promise<boolean> {\\n    elizaLogger.debug("Starting hasEnoughBalance function");\\n    try {\\n        const response = await client.listAccounts({});\\n        const accounts = JSON.parse(response);\\n        elizaLogger.info("Accounts:", accounts);\\n        const checkCurrency = side === "BUY" ? "USD" : currency;\\n        elizaLogger.info(\\n            `Checking balance for ${side} order of ${amount} ${checkCurrency}`\\n        );\\n\\n        // Find account with exact currency match\\n        const account = accounts?.accounts.find(\\n            (acc) =>\\n                acc.currency === checkCurrency &&\\n                (checkCurrency === "USD"\\n                    ? acc.type === "ACCOUNT_TYPE_FIAT"\\n                    : acc.type === "ACCOUNT_TYPE_CRYPTO")\\n        );\\n\\n        if (!account) {\\n            elizaLogger.error(`No ${checkCurrency} account found`);\\n            return false;\\n        }\\n\\n        const available = parseFloat(account.available_balance.value);\\n        // Add buffer for fees only on USD purchases\\n        const requiredAmount = side === "BUY" ? amount * 1.01 : amount;\\n        elizaLogger.info(\\n            `Required amount (including buffer): ${requiredAmount} ${checkCurrency}`\\n        );\\n\\n        const hasBalance = available >= requiredAmount;\\n        elizaLogger.info(`Has sufficient balance: ${hasBalance}`);\\n\\n        return hasBalance;\\n    } catch (error) {\\n        elizaLogger.error("Balance check failed with error:", {\\n            error: error instanceof Error ? error.message : "Unknown error",\\n            currency,\\n            amount,\\n            side,\\n        });\\n        return false;\\n    }\\n}\\n\\nexport const executeAdvancedTradeAction: Action = {\\n    name: "EXECUTE_ADVANCED_TRADE",\\n    description: "Execute a trade using Coinbase Advanced Trading API",\\n    validate: async (runtime: IAgentRuntime) => {\\n        return (\\n            !!(\\n                runtime.getSetting("COINBASE_API_KEY") ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.getSetting("COINBASE_PRIVATE_KEY") ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    similes: [\\n        "EXECUTE_ADVANCED_TRADE",\\n        "ADVANCED_MARKET_ORDER",\\n        "ADVANCED_LIMIT_ORDER",\\n        "COINBASE_PRO_TRADE",\\n        "PROFESSIONAL_TRADE",\\n    ],\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        let client: RESTClient;\\n\\n        // Initialize client\\n        elizaLogger.debug("Starting advanced trade client initialization");\\n        try {\\n            client = new RESTClient(\\n                runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY\\n            );\\n            elizaLogger.info("Advanced trade client initialized");\\n        } catch (error) {\\n            elizaLogger.error("Client initialization failed:", error);\\n            callback(\\n                {\\n                    text: "Failed to initialize trading client. Please check your API credentials.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        // Generate trade details\\n        let tradeDetails;\\n        elizaLogger.debug("Starting trade details generation");\\n        try {\\n            tradeDetails = await generateObject({\\n                runtime,\\n                context: composeContext({\\n                    state,\\n                    template: advancedTradeTemplate,\\n                }),\\n                modelClass: ModelClass.LARGE,\\n                schema: AdvancedTradeSchema,\\n            });\\n            elizaLogger.info("Trade details generated:", tradeDetails.object);\\n        } catch (error) {\\n            elizaLogger.error("Trade details generation failed:", error);\\n            callback(\\n                {\\n                    text: "Failed to generate trade details. Please provide valid trading parameters.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        // Validate trade content\\n        if (!isAdvancedTradeContent(tradeDetails.object)) {\\n            elizaLogger.error("Invalid trade content:", tradeDetails.object);\\n            callback(\\n                {\\n                    text: "Invalid trade details. Please check your input parameters.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        const { productId, amount, side, orderType, limitPrice } =\\n            tradeDetails.object;\\n\\n        // Configure order\\n        let orderConfiguration: OrderConfiguration;\\n        elizaLogger.debug("Starting order configuration");\\n        try {\\n            if (orderType === "MARKET") {\\n                orderConfiguration =\\n                    side === "BUY"\\n                        ? {\\n                              market_market_ioc: {\\n                                  quote_size: amount.toString(),\\n                              },\\n                          }\\n                        : {\\n                              market_market_ioc: {\\n                                  base_size: amount.toString(),\\n                              },\\n                          };\\n            } else {\\n                if (!limitPrice) {\\n                    throw new Error("Limit price is required for limit orders");\\n                }\\n                orderConfiguration = {\\n                    limit_limit_gtc: {\\n                        baseSize: amount.toString(),\\n                        limitPrice: limitPrice.toString(),\\n                        postOnly: false,\\n                    },\\n                };\\n            }\\n            elizaLogger.info(\\n                "Order configuration created:",\\n                orderConfiguration\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Order configuration failed:", error);\\n            callback(\\n                {\\n                    text:\\n                        error instanceof Error\\n                            ? error.message\\n                            : "Failed to configure order parameters.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        // Execute trade\\n        let order: CreateOrderResponse;\\n        try {\\n            elizaLogger.debug("Executing the trade");\\n            if (\\n                !(await hasEnoughBalance(\\n                    client,\\n                    productId.split("-")[0],\\n                    amount,\\n                    side\\n                ))\\n            ) {\\n                callback(\\n                    {\\n                        text: `Insufficient ${side === "BUY" ? "USD" : productId.split("-")[0]} balance to execute this trade`,\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            order = await client.createOrder({\\n                clientOrderId: crypto.randomUUID(),\\n                productId,\\n                side: side === "BUY" ? OrderSide.BUY : OrderSide.SELL,\\n                orderConfiguration,\\n            });\\n\\n            elizaLogger.info("Trade executed successfully:", order);\\n        } catch (error) {\\n            elizaLogger.error("Trade execution failed:", error?.message);\\n            callback(\\n                {\\n                    text: `Failed to execute trade: ${error instanceof Error ? error.message : "Unknown error occurred"}`,\\n                },\\n                []\\n            );\\n            return;\\n        }\\n        // Log trade to CSV\\n        try {\\n            // await appendTradeToCsv(order);\\n            elizaLogger.info("Trade logged to CSV");\\n        } catch (csvError) {\\n            elizaLogger.warn("Failed to log trade to CSV:", csvError);\\n            // Continue execution as this is non-critical\\n        }\\n\\n        callback(\\n            {\\n                text: `Advanced Trade executed successfully:\\n- Product: ${productId}\\n- Type: ${orderType} Order\\n- Side: ${side}\\n- Amount: ${amount}\\n- ${orderType === "LIMIT" ? `- Limit Price: ${limitPrice}\\n` : ""}- Order ID: ${order.order_id}\\n- Status: ${order.success}\\n- Order Id:  ${order.order_id}\\n- Response: ${JSON.stringify(order.response)}\\n- Order Configuration: ${JSON.stringify(order.order_configuration)}`,\\n            },\\n            []\\n        );\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Place an advanced market order to buy $1 worth of BTC",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Advanced Trade executed successfully:\\n- Product: BTC-USD\\n- Type: Market Order\\n- Side: BUY\\n- Amount: 1000\\n- Order ID: CB-ADV-12345\\n- Success: true\\n- Response: {"success_response":{}}\\n- Order Configuration: {"market_market_ioc":{"quote_size":"1000"}}`,\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: { text: "Set a limit order to sell 0.5 ETH at $2000" },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Advanced Trade executed successfully:\\n- Product: ETH-USD\\n- Type: Limit Order\\n- Side: SELL\\n- Amount: 0.5\\n- Limit Price: 2000\\n- Order ID: CB-ADV-67890\\n- Success: true\\n- Response: {"success_response":{}}\\n- Order Configuration: {"limit_limit_gtc":{"baseSize":"0.5","limitPrice":"2000","postOnly":false}}`,\\n                },\\n            },\\n        ],\\n    ],\\n};\\n\\nexport const advancedTradePlugin: Plugin = {\\n    name: "advancedTradePlugin",\\n    description: "Enables advanced trading using Coinbase Advanced Trading API",\\n    actions: [executeAdvancedTradeAction],\\n    providers: [tradeProvider],\\n};\\n',
                hash: "51759f75126084feb9bbbfa60083aa13ca32a9cb39e3e44d099c758dde332d75",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/src/plugins/advancedTrade.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "92931831-4d13-0aee-8988-f9def3e22b1b",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { generateToken } from '../jwt-generator';\\nimport fetch, { Headers, RequestInit, Response } from 'node-fetch';\\nimport { BASE_URL, USER_AGENT } from '../constants';\\nimport { RequestOptions } from './types/request-types';\\nimport { handleException } from './errors';\\n\\nexport class RESTBase {\\n  private apiKey: string | undefined;\\n  private apiSecret: string | undefined;\\n\\n  constructor(key?: string, secret?: string) {\\n    if (!key || !secret) {\\n      console.log('Could not authenticate. Only public endpoints accessible.');\\n    }\\n    this.apiKey = key;\\n    this.apiSecret = secret;\\n  }\\n\\n  request(options: RequestOptions): Promise<any> {\\n    const { method, endpoint, isPublic } = options;\\n    let { queryParams, bodyParams } = options;\\n\\n    queryParams = queryParams ? this.filterParams(queryParams) : {};\\n\\n    if (bodyParams !== undefined)\\n      bodyParams = bodyParams ? this.filterParams(bodyParams) : {};\\n\\n    return this.prepareRequest(\\n      method,\\n      endpoint,\\n      queryParams,\\n      bodyParams,\\n      isPublic\\n    );\\n  }\\n\\n  prepareRequest(\\n    httpMethod: string,\\n    urlPath: string,\\n    queryParams?: Record<string, any>,\\n    bodyParams?: Record<string, any>,\\n    isPublic?: boolean\\n  ) {\\n    const headers: Headers = this.setHeaders(httpMethod, urlPath, isPublic);\\n\\n    const requestOptions: RequestInit = {\\n      method: httpMethod,\\n      headers: headers,\\n      body: JSON.stringify(bodyParams),\\n    };\\n\\n    const queryString = this.buildQueryString(queryParams);\\n    const url = `https://${BASE_URL}${urlPath}${queryString}`;\\n\\n    return this.sendRequest(headers, requestOptions, url);\\n  }\\n\\n  async sendRequest(\\n    headers: Headers,\\n    requestOptions: RequestInit,\\n    url: string\\n  ) {\\n    const response: Response = await fetch(url, requestOptions);\\n    const responseText = await response.text();\\n    handleException(response, responseText, response.statusText);\\n\\n    return responseText;\\n  }\\n\\n  setHeaders(httpMethod: string, urlPath: string, isPublic?: boolean) {\\n    const headers: Headers = new Headers();\\n    headers.append('Content-Type', 'application/json');\\n    headers.append('User-Agent', USER_AGENT);\\n    if (this.apiKey !== undefined && this.apiSecret !== undefined)\\n      headers.append(\\n        'Authorization',\\n        `Bearer ${generateToken(\\n          httpMethod,\\n          urlPath,\\n          this.apiKey,\\n          this.apiSecret\\n        )}`\\n      );\\n    else if (isPublic == undefined || isPublic == false)\\n      throw new Error(\\n        'Attempting to access authenticated endpoint with invalid API_KEY or API_SECRET.'\\n      );\\n\\n    return headers;\\n  }\\n\\n  filterParams(data: Record<string, any>) {\\n    const filteredParams: Record<string, any> = {};\\n\\n    for (const key in data) {\\n      if (data[key] !== undefined) {\\n        filteredParams[key] = data[key];\\n      }\\n    }\\n\\n    return filteredParams;\\n  }\\n\\n  buildQueryString(queryParams?: Record<string, any>): string {\\n    if (!queryParams || Object.keys(queryParams).length === 0) {\\n      return '';\\n    }\\n\\n    const queryString = Object.entries(queryParams)\\n      .flatMap(([key, value]) => {\\n        if (Array.isArray(value)) {\\n          return value.map(\\n            (item) => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`\\n          );\\n        } else {\\n          return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;\\n        }\\n      })\\n      .join('&');\\n\\n    return `?${queryString}`;\\n  }\\n}\\n",
                hash: "a662b679d7e617f42f8a1bee0474d31eaeef8b43979da4430b99e741a2f3bf6b",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/rest-base.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "63419d4c-28d0-0ad9-9f12-0595fb117fae",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\nimport {\\n  GetPublicMarketTradesRequest,\\n  GetPublicMarketTradesResponse,\\n  GetPublicProductBookRequest,\\n  GetPublicProductBookResponse,\\n  GetPublicProductCandlesRequest,\\n  GetPublicProductCandlesResponse,\\n  GetPublicProductRequest,\\n  GetPublicProductResponse,\\n  GetServerTimeResponse,\\n  ListPublicProductsRequest,\\n  ListPublicProductsResponse,\\n} from './types/public-types';\\nimport { method } from './types/request-types';\\n\\n// [GET] Get Server Time\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getservertime\\nexport function getServerTime(this: RESTBase): Promise<GetServerTimeResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/time`,\\n    isPublic: true,\\n  });\\n}\\n\\n// [GET] Get Public Product Book\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getpublicproductbook\\nexport function getPublicProductBook(\\n  this: RESTBase,\\n  requestParams: GetPublicProductBookRequest\\n): Promise<GetPublicProductBookResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/market/product_book`,\\n    queryParams: requestParams,\\n    isPublic: true,\\n  });\\n}\\n\\n// [GET] List Public Products\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getpublicproducts\\nexport function listPublicProducts(\\n  this: RESTBase,\\n  requestParams: ListPublicProductsRequest\\n): Promise<ListPublicProductsResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/market/products`,\\n    queryParams: requestParams,\\n    isPublic: true,\\n  });\\n}\\n\\n// [GET] Get Public Product\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getpublicproduct\\nexport function getPublicProduct(\\n  this: RESTBase,\\n  { productId }: GetPublicProductRequest\\n): Promise<GetPublicProductResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/market/products/${productId}`,\\n    isPublic: true,\\n  });\\n}\\n\\n// [GET] Get Public Product Candles\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getpubliccandles\\nexport function getPublicProductCandles(\\n  this: RESTBase,\\n  { productId, ...requestParams }: GetPublicProductCandlesRequest\\n): Promise<GetPublicProductCandlesResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/market/products/${productId}/candles`,\\n    queryParams: requestParams,\\n    isPublic: true,\\n  });\\n}\\n\\n// [GET] Get Public Market Trades\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getpublicmarkettrades\\nexport function getPublicMarketTrades(\\n  this: RESTBase,\\n  { productId, ...requestParams }: GetPublicMarketTradesRequest\\n): Promise<GetPublicMarketTradesResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/products/${productId}/ticker`,\\n    queryParams: requestParams,\\n    isPublic: true,\\n  });\\n}\\n",
                hash: "ca2b028d2b0f962b5dab157e3bcbdf906988bfd5297f32dcca2219790fd268eb",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/public.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "0ad1dc0b-2d45-0fc3-8953-704783ff9742",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\nimport {\\n  GetBestBidAskRequest,\\n  GetBestBidAskResponse,\\n  GetMarketTradesRequest,\\n  GetMarketTradesResponse,\\n  GetProductBookRequest,\\n  GetProductBookResponse,\\n  GetProductCandlesRequest,\\n  GetProductCandlesResponse,\\n  GetProductRequest,\\n  GetProductResponse,\\n  ListProductsRequest,\\n  ListProductsResponse,\\n} from './types/products-types';\\nimport { method } from './types/request-types';\\n\\n// [GET] Get Best Bid Ask\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getbestbidask\\nexport function getBestBidAsk(\\n  this: RESTBase,\\n  requestParams: GetBestBidAskRequest\\n): Promise<GetBestBidAskResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/best_bid_ask`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Product Book\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getproductbook\\nexport function getProductBook(\\n  this: RESTBase,\\n  requestParams: GetProductBookRequest\\n): Promise<GetProductBookResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/product_book`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] List Products\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getproducts\\nexport function listProducts(\\n  this: RESTBase,\\n  requestParams: ListProductsRequest\\n): Promise<ListProductsResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/products`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Product\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getproduct\\nexport function getProduct(\\n  this: RESTBase,\\n  { productId, ...requestParams }: GetProductRequest\\n): Promise<GetProductResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/products/${productId}`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Product Candles\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getcandles\\nexport function getProductCandles(\\n  this: RESTBase,\\n  { productId, ...requestParams }: GetProductCandlesRequest\\n): Promise<GetProductCandlesResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/products/${productId}/candles`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Market Trades\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getmarkettrades\\nexport function getMarketTrades(\\n  this: RESTBase,\\n  { productId, ...requestParams }: GetMarketTradesRequest\\n): Promise<GetMarketTradesResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/products/${productId}/ticker`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n",
                hash: "8b21f64099678e8c13c7992138c1593d6573f25e3eba085f1b92f8b1e159a797",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/products.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "2d306c5c-69db-0458-8138-3785772f98b6",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\nimport {\\n  CreatePortfolioRequest,\\n  CreatePortfolioResponse,\\n  DeletePortfolioRequest,\\n  DeletePortfolioResponse,\\n  EditPortfolioRequest,\\n  EditPortfolioResponse,\\n  GetPortfolioBreakdownRequest,\\n  GetPortfolioBreakdownResponse,\\n  ListPortfoliosRequest,\\n  ListPortfoliosResponse,\\n  MovePortfolioFundsRequest,\\n  MovePortfolioFundsResponse,\\n} from './types/portfolios-types';\\nimport { method } from './types/request-types';\\n\\n// [GET] List Portfolios\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getportfolios\\nexport function listPortfolios(\\n  this: RESTBase,\\n  requestParams: ListPortfoliosRequest\\n): Promise<ListPortfoliosResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/portfolios`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Create Portfolio\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_createportfolio\\nexport function createPortfolio(\\n  this: RESTBase,\\n  requestParams: CreatePortfolioRequest\\n): Promise<CreatePortfolioResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/portfolios`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Move Portfolio Funds\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_moveportfoliofunds\\nexport function movePortfolioFunds(\\n  this: RESTBase,\\n  requestParams: MovePortfolioFundsRequest\\n): Promise<MovePortfolioFundsResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/portfolios/move_funds`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Portfolio Breakdown\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getportfoliobreakdown\\nexport function getPortfolioBreakdown(\\n  this: RESTBase,\\n  { portfolioUuid, ...requestParams }: GetPortfolioBreakdownRequest\\n): Promise<GetPortfolioBreakdownResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/portfolios/${portfolioUuid}`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [DELETE] Delete Portfolio\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_deleteportfolio\\nexport function deletePortfolio(\\n  this: RESTBase,\\n  { portfolioUuid }: DeletePortfolioRequest\\n): Promise<DeletePortfolioResponse> {\\n  return this.request({\\n    method: method.DELETE,\\n    endpoint: `${API_PREFIX}/portfolios/${portfolioUuid}`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [PUT] Edit Portfolio\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_editportfolio\\nexport function editPortfolio(\\n  this: RESTBase,\\n  { portfolioUuid, ...requestParams }: EditPortfolioRequest\\n): Promise<EditPortfolioResponse> {\\n  return this.request({\\n    method: method.PUT,\\n    endpoint: `${API_PREFIX}/portfolios/${portfolioUuid}`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n",
                hash: "3c1cba7bcd304257f4a798f278d7b1b4781a9623f00d49af64a44fa3a20fd8bd",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/portfolios.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "720f2e01-d382-0240-b6de-f13e1fd0cee6",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\nimport {\\n  AllocatePortfolioRequest,\\n  AllocatePortfolioResponse,\\n  GetPerpetualsPortfolioSummaryRequest,\\n  GetPerpetualsPortfolioSummaryResponse,\\n  GetPerpetualsPositionRequest,\\n  GetPerpetualsPositionResponse,\\n  GetPortfolioBalancesRequest,\\n  GetPortfolioBalancesResponse,\\n  ListPerpetualsPositionsRequest,\\n  ListPerpetualsPositionsResponse,\\n  OptInOutMultiAssetCollateralRequest,\\n  OptInOutMultiAssetCollateralResponse,\\n} from './types/perpetuals-types';\\nimport { method } from './types/request-types';\\n\\n// [POST] Allocate Portfolio\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_allocateportfolio\\nexport function allocatePortfolio(\\n  this: RESTBase,\\n  requestParams: AllocatePortfolioRequest\\n): Promise<AllocatePortfolioResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/intx/allocate`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Perpetuals Portfolio Summary\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getintxportfoliosummary\\nexport function getPerpetualsPortfolioSummary(\\n  this: RESTBase,\\n  { portfolioUuid }: GetPerpetualsPortfolioSummaryRequest\\n): Promise<GetPerpetualsPortfolioSummaryResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/intx/portfolio/${portfolioUuid}`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] List Perpetuals Positions\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getintxpositions\\nexport function listPerpetualsPositions(\\n  this: RESTBase,\\n  { portfolioUuid }: ListPerpetualsPositionsRequest\\n): Promise<ListPerpetualsPositionsResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/intx/positions/${portfolioUuid}`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Perpetuals Position\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getintxposition\\nexport function getPerpertualsPosition(\\n  this: RESTBase,\\n  { portfolioUuid, symbol }: GetPerpetualsPositionRequest\\n): Promise<GetPerpetualsPositionResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/intx/positions/${portfolioUuid}/${symbol}`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Portfolio Balances\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getintxbalances\\nexport function getPortfolioBalances(\\n  this: RESTBase,\\n  { portfolioUuid }: GetPortfolioBalancesRequest\\n): Promise<GetPortfolioBalancesResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/intx/balances/${portfolioUuid}`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Opt In or Out of Multi Asset Collateral\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_intxmultiassetcollateral\\nexport function optInOutMultiAssetCollateral(\\n  this: RESTBase,\\n  requestParams: OptInOutMultiAssetCollateralRequest\\n): Promise<OptInOutMultiAssetCollateralResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/intx/multi_asset_collateral`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n",
                hash: "d8b4ce8b585d3901c117002aef5808c256e772fe35d78c5fbeef62a67d91c4a2",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/perpetuals.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "70a1e532-a115-08b4-b95a-33ccb396c025",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\nimport {\\n  GetPaymentMethodRequest,\\n  GetPaymentMethodResponse,\\n  ListPaymentMethodsResponse,\\n} from './types/payments-types';\\nimport { method } from './types/request-types';\\n\\n// [GET] List Payment Methods\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getpaymentmethods\\nexport function listPaymentMethods(\\n  this: RESTBase\\n): Promise<ListPaymentMethodsResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/payment_methods`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Payment Method\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getpaymentmethod\\nexport function getPaymentMethod(\\n  this: RESTBase,\\n  { paymentMethodId }: GetPaymentMethodRequest\\n): Promise<GetPaymentMethodResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/payment_methods/${paymentMethodId}`,\\n    isPublic: false,\\n  });\\n}\\n",
                hash: "640df784a90da28901527b8f946a8329cd4f1aeaebf7e95c28982e19f54b3dec",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/payments.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "542e48c1-686e-0f7d-991d-254c8dbd96cd",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\nimport {\\n  CancelOrdersRequest,\\n  CancelOrdersResponse,\\n  ClosePositionRequest,\\n  ClosePositionResponse,\\n  CreateOrderRequest,\\n  CreateOrderResponse,\\n  EditOrderPreviewRequest,\\n  EditOrderPreviewResponse,\\n  EditOrderRequest,\\n  EditOrderResponse,\\n  GetOrderRequest,\\n  GetOrderResponse,\\n  ListFillsRequest,\\n  ListFillsResponse,\\n  ListOrdersRequest,\\n  ListOrdersResponse,\\n  PreviewOrderRequest,\\n  PreviewOrderResponse,\\n} from './types/orders-types';\\nimport { method } from './types/request-types';\\n\\n// [POST] Create Order\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_postorder\\nexport function createOrder(\\n  this: RESTBase,\\n  requestParams: CreateOrderRequest\\n): Promise<CreateOrderResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/orders`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Cancel Orders\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_cancelorders\\nexport function cancelOrders(\\n  this: RESTBase,\\n  requestParams: CancelOrdersRequest\\n): Promise<CancelOrdersResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/orders/batch_cancel`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Edit Order\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_editorder\\nexport function editOrder(\\n  this: RESTBase,\\n  requestParams: EditOrderRequest\\n): Promise<EditOrderResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/orders/edit`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Edit Order Preview\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_previeweditorder\\nexport function editOrderPreview(\\n  this: RESTBase,\\n  requestParams: EditOrderPreviewRequest\\n): Promise<EditOrderPreviewResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/orders/edit_preview`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] List Orders\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_gethistoricalorders\\nexport function listOrders(\\n  this: RESTBase,\\n  requestParams: ListOrdersRequest\\n): Promise<ListOrdersResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/orders/historical/batch`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] List Fills\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getfills\\nexport function listFills(\\n  this: RESTBase,\\n  requestParams: ListFillsRequest\\n): Promise<ListFillsResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/orders/historical/fills`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Order\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_gethistoricalorder\\nexport function getOrder(\\n  this: RESTBase,\\n  { orderId }: GetOrderRequest\\n): Promise<GetOrderResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/orders/historical/${orderId}`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Preview Order\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_previeworder\\nexport function previewOrder(\\n  this: RESTBase,\\n  requestParams: PreviewOrderRequest\\n): Promise<PreviewOrderResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/orders/preview`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Close Position\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_closeposition\\nexport function closePosition(\\n  this: RESTBase,\\n  requestParams: ClosePositionRequest\\n): Promise<ClosePositionResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/orders/close_position`,\\n    queryParams: undefined,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n",
                hash: "26ac0411bdbb1ae7d3261a358683a823f6b91464984b4c6ea3fb75c5ede5680f",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/orders.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "f2c2edd2-31f1-035e-8891-dc38b259fbe4",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { RESTBase } from './rest-base';\\nimport * as Accounts from './accounts';\\nimport * as Converts from './converts';\\nimport * as DataAPI from './dataAPI';\\nimport * as Fees from './fees';\\nimport * as Futures from './futures';\\nimport * as Orders from './orders';\\nimport * as Payments from './payments';\\nimport * as Perpetuals from './perpetuals';\\nimport * as Portfolios from './portfolios';\\nimport * as Products from './products';\\nimport * as Public from './public';\\n\\nexport class RESTClient extends RESTBase {\\n  constructor(key?: string | undefined, secret?: string | undefined) {\\n    super(key, secret);\\n  }\\n\\n  // =============== ACCOUNTS endpoints ===============\\n  public getAccount = Accounts.getAccount.bind(this);\\n  public listAccounts = Accounts.listAccounts.bind(this);\\n\\n  // =============== CONVERTS endpoints ===============\\n  public createConvertQuote = Converts.createConvertQuote.bind(this);\\n  public commitConvertTrade = Converts.commitConvertTrade.bind(this);\\n  public getConvertTrade = Converts.getConvertTrade.bind(this);\\n\\n  // =============== DATA API endpoints ===============\\n  public getAPIKeyPermissions = DataAPI.getAPIKeyPermissions.bind(this);\\n\\n  // =============== FEES endpoints ===============\\n  public getTransactionSummary = Fees.getTransactionSummary.bind(this);\\n\\n  // =============== FUTURES endpoints ===============\\n  public getFuturesBalanceSummary = Futures.getFuturesBalanceSummary.bind(this);\\n  public getIntradayMarginSetting = Futures.getIntradayMarginSetting.bind(this);\\n  public setIntradayMarginSetting = Futures.setIntradayMarginSetting.bind(this);\\n  public getCurrentMarginWindow = Futures.getCurrentMarginWindow.bind(this);\\n  public listFuturesPositions = Futures.listFuturesPositions.bind(this);\\n  public getFuturesPosition = Futures.getFuturesPosition.bind(this);\\n  public scheduleFuturesSweep = Futures.scheduleFuturesSweep.bind(this);\\n  public listFuturesSweeps = Futures.listFuturesSweeps.bind(this);\\n  public cancelPendingFuturesSweep =\\n    Futures.cancelPendingFuturesSweep.bind(this);\\n\\n  // =============== ORDERS endpoints ===============\\n  public createOrder = Orders.createOrder.bind(this);\\n  public cancelOrders = Orders.cancelOrders.bind(this);\\n  public editOrder = Orders.editOrder.bind(this);\\n  public editOrderPreview = Orders.editOrderPreview.bind(this);\\n  public listOrders = Orders.listOrders.bind(this);\\n  public listFills = Orders.listFills.bind(this);\\n  public getOrder = Orders.getOrder.bind(this);\\n  public previewOrder = Orders.previewOrder.bind(this);\\n  public closePosition = Orders.closePosition.bind(this);\\n\\n  // =============== PAYMENTS endpoints ===============\\n  public listPaymentMethods = Payments.listPaymentMethods.bind(this);\\n  public getPaymentMethod = Payments.getPaymentMethod.bind(this);\\n\\n  // =============== PERPETUALS endpoints ===============\\n  public allocatePortfolio = Perpetuals.allocatePortfolio.bind(this);\\n  public getPerpetualsPortfolioSummary =\\n    Perpetuals.getPerpetualsPortfolioSummary.bind(this);\\n  public listPerpetualsPositions =\\n    Perpetuals.listPerpetualsPositions.bind(this);\\n  public getPerpetualsPosition = Perpetuals.getPerpertualsPosition.bind(this);\\n  public getPortfolioBalances = Perpetuals.getPortfolioBalances.bind(this);\\n  public optInOutMultiAssetCollateral =\\n    Perpetuals.optInOutMultiAssetCollateral.bind(this);\\n\\n  // =============== PORTFOLIOS endpoints ===============\\n  public listPortfolios = Portfolios.listPortfolios.bind(this);\\n  public createPortfolio = Portfolios.createPortfolio.bind(this);\\n  public deletePortfolio = Portfolios.deletePortfolio.bind(this);\\n  public editPortfolio = Portfolios.editPortfolio.bind(this);\\n  public movePortfolioFunds = Portfolios.movePortfolioFunds.bind(this);\\n  public getPortfolioBreakdown = Portfolios.getPortfolioBreakdown.bind(this);\\n\\n  // =============== PRODUCTS endpoints ===============\\n  public getBestBidAsk = Products.getBestBidAsk.bind(this);\\n  public getProductBook = Products.getProductBook.bind(this);\\n  public listProducts = Products.listProducts.bind(this);\\n  public getProduct = Products.getProduct.bind(this);\\n  public getProductCandles = Products.getProductCandles.bind(this);\\n  public getMarketTrades = Products.getMarketTrades.bind(this);\\n\\n  // =============== PUBLIC endpoints ===============\\n  public getServerTime = Public.getServerTime.bind(this);\\n  public getPublicProductBook = Public.getPublicProductBook.bind(this);\\n  public listPublicProducts = Public.listPublicProducts.bind(this);\\n  public getPublicProduct = Public.getPublicProduct.bind(this);\\n  public getPublicProductCandles = Public.getPublicProductCandles.bind(this);\\n  public getPublicMarketTrades = Public.getPublicMarketTrades.bind(this);\\n}\\n",
                hash: "a97c412a6b9b9b981a858ca7ab461e788e6fbc0307928e6b6a7423ca33087656",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/index.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "b272a5a4-989d-05fa-b54f-006ea170ac14",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\nimport {\\n  CancelPendingFuturesSweep,\\n  GetCurrentMarginWindowRequest,\\n  GetCurrentMarginWindowResponse,\\n  GetFuturesBalanceSummaryResponse,\\n  GetFuturesPositionRequest,\\n  GetFuturesPositionResponse,\\n  GetIntradayMarginSettingResponse,\\n  ListFuturesPositionsResponse,\\n  ListFuturesSweepsResponse,\\n  ScheduleFuturesSweepRequest,\\n  ScheduleFuturesSweepResponse,\\n  SetIntradayMarginSettingRequest,\\n  SetIntradayMarginSettingResponse,\\n} from './types/futures-types';\\nimport { method } from './types/request-types';\\n\\n// [GET] Get Futures Balance Summary\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getfcmbalancesummary\\nexport function getFuturesBalanceSummary(\\n  this: RESTBase\\n): Promise<GetFuturesBalanceSummaryResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/cfm/balance_summary`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Intraday Margin Setting\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getintradaymarginsetting\\nexport function getIntradayMarginSetting(\\n  this: RESTBase\\n): Promise<GetIntradayMarginSettingResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/cfm/intraday/margin_setting`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Set Intraday Margin Setting\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_setintradaymarginsetting\\nexport function setIntradayMarginSetting(\\n  this: RESTBase,\\n  requestParams: SetIntradayMarginSettingRequest\\n): Promise<SetIntradayMarginSettingResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/cfm/intraday/margin_setting`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Current Margin Window\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getcurrentmarginwindow\\nexport function getCurrentMarginWindow(\\n  this: RESTBase,\\n  requestParams: GetCurrentMarginWindowRequest\\n): Promise<GetCurrentMarginWindowResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/cfm/intraday/current_margin_window`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] List Futures Positions\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getfcmpositions\\nexport function listFuturesPositions(\\n  this: RESTBase\\n): Promise<ListFuturesPositionsResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/cfm/positions`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Futures Position\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getfcmposition\\nexport function getFuturesPosition(\\n  this: RESTBase,\\n  { productId }: GetFuturesPositionRequest\\n): Promise<GetFuturesPositionResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/cfm/positions/${productId}`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Schedule Futures Sweep\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_schedulefcmsweep\\nexport function scheduleFuturesSweep(\\n  this: RESTBase,\\n  requestParams: ScheduleFuturesSweepRequest\\n): Promise<ScheduleFuturesSweepResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/cfm/sweeps/schedule`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] List Futures Sweeps\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getfcmsweeps\\nexport function listFuturesSweeps(\\n  this: RESTBase\\n): Promise<ListFuturesSweepsResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/cfm/sweeps`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [DELETE] Cancel Pending Futures Sweep\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_cancelfcmsweep\\nexport function cancelPendingFuturesSweep(\\n  this: RESTBase\\n): Promise<CancelPendingFuturesSweep> {\\n  return this.request({\\n    method: method.DELETE,\\n    endpoint: `${API_PREFIX}/cfm/sweeps`,\\n    isPublic: false,\\n  });\\n}\\n",
                hash: "9db4781042e5e9123d1b5c12067c15249254eaf9c7b5bd832179fc8c4748e78c",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/futures.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "4d8d3498-54ad-0028-9fd4-ad0e07cc3301",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\nimport {\\n  GetTransactionsSummaryRequest,\\n  GetTransactionsSummaryResponse,\\n} from './types/fees-types';\\nimport { method } from './types/request-types';\\n\\n// [GET] Get Transaction Summary\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_commitconverttrade\\nexport function getTransactionSummary(\\n  this: RESTBase,\\n  requestParams: GetTransactionsSummaryRequest\\n): Promise<GetTransactionsSummaryResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/transaction_summary`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n",
                hash: "776ca0e60564c09a30f30fd2d833ad01e4f59f7bd56f6a0d74baacc4074da736",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/fees.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "0370ae51-4ddf-05b6-9c16-ddf06dff619d",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { Response } from 'node-fetch';\\n\\nclass CoinbaseError extends Error {\\n  statusCode: number;\\n  response: Response;\\n\\n  constructor(message: string, statusCode: number, response: Response) {\\n    super(message);\\n    this.name = 'CoinbaseError';\\n    this.statusCode = statusCode;\\n    this.response = response;\\n  }\\n}\\n\\nexport function handleException(\\n  response: Response,\\n  responseText: string,\\n  reason: string\\n) {\\n  let message: string | undefined;\\n\\n  if (\\n    (400 <= response.status && response.status <= 499) ||\\n    (500 <= response.status && response.status <= 599)\\n  ) {\\n    if (\\n      response.status == 403 &&\\n      responseText.includes('\"error_details\":\"Missing required scopes\"')\\n    ) {\\n      message = `${response.status} Coinbase Error: Missing Required Scopes. Please verify your API keys include the necessary permissions.`;\\n    } else\\n      message = `${response.status} Coinbase Error: ${reason} ${responseText}`;\\n\\n    throw new CoinbaseError(message, response.status, response);\\n  }\\n}\\n",
                hash: "68664fd97866b377e7292e96b164ccd06a9873297f56126d1605a4ae2c556737",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/errors.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "cc67ad96-bf8d-0b81-8dc8-7f4e8f1d9739",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\n\\nimport { method } from './types/request-types';\\nimport { GetAPIKeyPermissionsResponse } from './types/dataAPI-types';\\n\\n// [GET] Get API Key Permissions\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getapikeypermissions\\nexport function getAPIKeyPermissions(\\n  this: RESTBase\\n): Promise<GetAPIKeyPermissionsResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/key_permissions`,\\n    isPublic: false,\\n  });\\n}\\n",
                hash: "bf18a3675dd0142e239557890142e60aa8600fd4f507c016ea46bef18daeccd9",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/dataAPI.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "cd62888b-b3ae-00a9-be44-e987abc3c87f",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\nimport {\\n  CommitConvertTradeRequest,\\n  CommitConvertTradeResponse,\\n  CreateConvertQuoteRequest,\\n  CreateConvertQuoteResponse,\\n  GetConvertTradeRequest,\\n  GetConvertTradeResponse,\\n} from './types/converts-types';\\nimport { method } from './types/request-types';\\n\\n// [POST] Create Convert Quote\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_createconvertquote\\nexport function createConvertQuote(\\n  this: RESTBase,\\n  requestParams: CreateConvertQuoteRequest\\n): Promise<CreateConvertQuoteResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/convert/quote`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] Get Convert Trade\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getconverttrade\\nexport function getConvertTrade(\\n  this: RESTBase,\\n  { tradeId, ...requestParams }: GetConvertTradeRequest\\n): Promise<GetConvertTradeResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/convert/trade/${tradeId}`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n\\n// [POST] Commit Connvert Trade\\n// https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_commitconverttrade\\nexport function commitConvertTrade(\\n  this: RESTBase,\\n  { tradeId, ...requestParams }: CommitConvertTradeRequest\\n): Promise<CommitConvertTradeResponse> {\\n  return this.request({\\n    method: method.POST,\\n    endpoint: `${API_PREFIX}/convert/trade/${tradeId}`,\\n    bodyParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n",
                hash: "3797bf0f2c8ef68bb781323917ce04711676150a9913218672d549d91c59ddf1",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/converts.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "4a7bb965-b5fe-0be9-9803-f5988d6f05e3",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { API_PREFIX } from '../constants';\\nimport { RESTBase } from './rest-base';\\nimport {\\n  GetAccountRequest,\\n  GetAccountResponse,\\n  ListAccountsRequest,\\n  ListAccountsResponse,\\n} from './types/accounts-types';\\nimport { method } from './types/request-types';\\n\\n// [GET] Get Account\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getaccount\\nexport function getAccount(\\n  this: RESTBase,\\n  { accountUuid }: GetAccountRequest\\n): Promise<GetAccountResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/accounts/${accountUuid}`,\\n    isPublic: false,\\n  });\\n}\\n\\n// [GET] List Accounts\\n// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getaccounts\\nexport function listAccounts(\\n  this: RESTBase,\\n  requestParams: ListAccountsRequest\\n): Promise<ListAccountsResponse> {\\n  return this.request({\\n    method: method.GET,\\n    endpoint: `${API_PREFIX}/accounts`,\\n    queryParams: requestParams,\\n    isPublic: false,\\n  });\\n}\\n",
                hash: "a9d35fc90d0af6bc7f2fdf035df587b9e76bdf20ba79582caef001519da7e226",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/accounts.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "6dda1ed1-0d8e-0a2b-b7d6-22c542e04565",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "export enum method {\\n  GET = 'GET',\\n  POST = 'POST',\\n  PUT = 'PUT',\\n  DELETE = 'DELETE',\\n}\\n\\nexport interface RequestOptions {\\n  method: method;\\n  endpoint: string;\\n  queryParams?: Record<string, any>;\\n  bodyParams?: Record<string, any>;\\n  isPublic: boolean;\\n}\\n",
                hash: "df6db1e7bd6d6fc54ce93acee2bcec4603fe66e68354f09ed8d0d030db4aa31c",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/request-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "fcc82a4a-7a1e-09d3-ad34-613d32640a8c",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import {\\n  Candles,\\n  ContractExpiryType,\\n  ExpiringContractStatus,\\n  HistoricalMarketTrade,\\n  PriceBook,\\n  Product,\\n  Products,\\n  ProductType,\\n} from './common-types';\\n\\n// Get Server Time\\nexport type GetServerTimeResponse = {\\n  iso?: string;\\n  epochSeconds?: number;\\n  epochMillis?: number;\\n};\\n\\n// Get Public Product Book\\nexport type GetPublicProductBookRequest = {\\n  // Query Params\\n  productId: string;\\n  limit?: number;\\n  aggregationPriceIncrement?: number;\\n};\\n\\nexport type GetPublicProductBookResponse = {\\n  pricebook: PriceBook;\\n};\\n\\n// List Public Products\\nexport type ListPublicProductsRequest = {\\n  // Query Params\\n  limit?: number;\\n  offset?: number;\\n  productType?: ProductType;\\n  productIds?: string[];\\n  contractExpiryType?: ContractExpiryType;\\n  expiringContractStatus?: ExpiringContractStatus;\\n  getAllProducts?: boolean;\\n};\\n\\nexport type ListPublicProductsResponse = {\\n  body?: Products;\\n};\\n\\n// Get Public Product\\nexport type GetPublicProductRequest = {\\n  // Path Params\\n  productId: string;\\n};\\n\\nexport type GetPublicProductResponse = {\\n  body?: Product;\\n};\\n\\n//Get Public Product Candles\\nexport type GetPublicProductCandlesRequest = {\\n  // Path Params\\n  productId: string;\\n\\n  // Query Params\\n  start: string;\\n  end: string;\\n  granularity: string;\\n  limit?: number;\\n};\\n\\nexport type GetPublicProductCandlesResponse = {\\n  body?: Candles;\\n};\\n\\n// Get Public Market Trades\\nexport type GetPublicMarketTradesRequest = {\\n  // Path Params\\n  productId: string;\\n\\n  // Query Params\\n  limit: number;\\n  start?: string;\\n  end?: string;\\n};\\n\\nexport type GetPublicMarketTradesResponse = {\\n  trades?: HistoricalMarketTrade[];\\n  best_bid?: string;\\n  best_ask?: string;\\n};\\n",
                hash: "5afc0d219f81fa302fcbe5287f8319d7d60261fb90d398363054b6b22e3ea7d5",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/public-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "2429cae3-5e8e-00c5-8a19-3f5bf129df79",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import {\\n  Candles,\\n  ContractExpiryType,\\n  ExpiringContractStatus,\\n  Granularity,\\n  HistoricalMarketTrade,\\n  PriceBook,\\n  Product,\\n  Products,\\n  ProductType,\\n} from './common-types';\\n\\n// Get Best Bid Ask\\nexport type GetBestBidAskRequest = {\\n  // Query Params\\n  productIds?: string[];\\n};\\n\\nexport type GetBestBidAskResponse = {\\n  pricebooks: PriceBook[];\\n};\\n\\n// Get Product Book\\nexport type GetProductBookRequest = {\\n  // Query Params\\n  productId: string;\\n  limit?: number;\\n  aggregationPriceIncrement?: number;\\n};\\n\\nexport type GetProductBookResponse = {\\n  pricebook: PriceBook;\\n};\\n\\n// List Products\\nexport type ListProductsRequest = {\\n  // Query Params\\n  limit?: number;\\n  offset?: number;\\n  productType?: ProductType;\\n  productIds?: string[];\\n  contractExpiryType?: ContractExpiryType;\\n  expiringContractStatus?: ExpiringContractStatus;\\n  getTradabilityStatus?: boolean;\\n  getAllProducts?: boolean;\\n};\\n\\nexport type ListProductsResponse = {\\n  body?: Products;\\n};\\n\\n// Get Product\\nexport type GetProductRequest = {\\n  // Path Params\\n  productId: string;\\n\\n  // Query Params\\n  getTradabilityStatus?: boolean;\\n};\\n\\nexport type GetProductResponse = {\\n  body?: Product;\\n};\\n\\n// Get Product Candles\\nexport type GetProductCandlesRequest = {\\n  // Path Params\\n  productId: string;\\n\\n  // Query Params\\n  start: string;\\n  end: string;\\n  granularity: Granularity;\\n  limit?: number;\\n};\\n\\nexport type GetProductCandlesResponse = {\\n  body?: Candles;\\n};\\n\\n// Get Market Trades\\nexport type GetMarketTradesRequest = {\\n  // Path Params\\n  productId: string;\\n\\n  // Query Params\\n  limit: number;\\n  start?: string;\\n  end?: string;\\n};\\n\\nexport type GetMarketTradesResponse = {\\n  trades?: HistoricalMarketTrade[];\\n  best_bid?: string;\\n  best_ask?: string;\\n};\\n",
                hash: "9c0471a8edb80d3f1f20f25858c62cd4498ac3a1aba809221895b2026bc7e470",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/products-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "357cc19e-8163-0946-b38d-d101356849f4",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { Portfolio, PortfolioBreakdown, PortfolioType } from './common-types';\\n\\n// List Portfolios\\nexport type ListPortfoliosRequest = {\\n  // Query Params\\n  portfolioType?: PortfolioType;\\n};\\n\\nexport type ListPortfoliosResponse = {\\n  portfolios?: Portfolio[];\\n};\\n\\n// Create Portfolio\\nexport type CreatePortfolioRequest = {\\n  // Body Params\\n  name: string;\\n};\\n\\nexport type CreatePortfolioResponse = {\\n  portfolio?: Portfolio;\\n};\\n\\n// Move Portfolio Funds\\nexport type MovePortfolioFundsRequest = {\\n  // Body Params\\n  funds: Record<string, any>;\\n  sourcePortfolioUuid: string;\\n  targetPortfolioUuid: string;\\n};\\n\\nexport type MovePortfolioFundsResponse = {\\n  source_portfolio_uuid?: string;\\n  target_portfolio_uuid?: string;\\n};\\n\\n// Get Portfolio Breakdown\\nexport type GetPortfolioBreakdownRequest = {\\n  // Path Params\\n  portfolioUuid: string;\\n\\n  // Query Params\\n  currency?: string;\\n};\\n\\nexport type GetPortfolioBreakdownResponse = {\\n  breakdown?: PortfolioBreakdown;\\n};\\n\\n// Delete Portfolio\\nexport type DeletePortfolioRequest = {\\n  // Path Params\\n  portfolioUuid: string;\\n};\\n\\nexport type DeletePortfolioResponse = Record<string, never>;\\n\\n// Edit Portfolio\\nexport type EditPortfolioRequest = {\\n  // Path Params\\n  portfolioUuid: string;\\n\\n  // Body Params\\n  name: string;\\n};\\n\\nexport type EditPortfolioResponse = {\\n  portfolio?: Portfolio;\\n};\\n",
                hash: "107759f2eece854232b121cc3e8f6f9e2ca087d5746e2737eae47336e772a560",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/portfolios-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "d0f9929d-64d1-0ec7-8aba-be09fe9253af",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import {\\n  PerpetualPortfolio,\\n  PortfolioBalance,\\n  PortfolioSummary,\\n  Position,\\n  PositionSummary,\\n} from './common-types';\\n\\n// Allocate Portfolio\\nexport type AllocatePortfolioRequest = {\\n  // Body Params\\n  portfolioUuid: string;\\n  symbol: string;\\n  amount: string;\\n  currency: string;\\n};\\n\\nexport type AllocatePortfolioResponse = Record<string, never>;\\n\\n// Get Perpetuals Portfolio Summary\\nexport type GetPerpetualsPortfolioSummaryRequest = {\\n  // Path Params\\n  portfolioUuid: string;\\n};\\n\\nexport type GetPerpetualsPortfolioSummaryResponse = {\\n  portfolios?: PerpetualPortfolio[];\\n  summary?: PortfolioSummary;\\n};\\n\\n// List Perpetuals Positions\\nexport type ListPerpetualsPositionsRequest = {\\n  // Path Params\\n  portfolioUuid: string;\\n};\\n\\nexport type ListPerpetualsPositionsResponse = {\\n  positions?: Position[];\\n  summary?: PositionSummary;\\n};\\n\\n// Get Perpetuals Position\\nexport type GetPerpetualsPositionRequest = {\\n  // Path Params\\n  portfolioUuid: string;\\n  symbol: string;\\n};\\n\\nexport type GetPerpetualsPositionResponse = {\\n  position?: Position;\\n};\\n\\n// Get Portfolio Balances\\nexport type GetPortfolioBalancesRequest = {\\n  // Path Params\\n  portfolioUuid: string;\\n};\\n\\nexport type GetPortfolioBalancesResponse = {\\n  portfolio_balancces?: PortfolioBalance[];\\n};\\n\\n// Opt In or Out of Multi Asset Collateral\\nexport type OptInOutMultiAssetCollateralRequest = {\\n  // Body Params\\n  portfolioUuid?: string;\\n  multiAssetCollateralEnabled?: boolean;\\n};\\n\\nexport type OptInOutMultiAssetCollateralResponse = {\\n  cross_collateral_enabled?: boolean;\\n};\\n",
                hash: "ab1dd082e1ed0fbf0e658a4a870abe4aa89f1d5a45e2bf3d1b9ed87585489984",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/perpetuals-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "cbc39c44-24f9-0523-99ed-5c01898f80c9",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { PaymentMethod } from './common-types';\\n\\n// List Payment Methods\\nexport type ListPaymentMethodsResponse = {\\n  paymentMethods?: PaymentMethod;\\n};\\n\\n// Get Payment Method\\nexport type GetPaymentMethodRequest = {\\n  // Path Params\\n  paymentMethodId: string;\\n};\\n\\nexport type GetPaymentMethodResponse = {\\n  paymentMethod?: PaymentMethod;\\n};\\n",
                hash: "ed74219bd58cae8cfae89f772d848764dab532fe32f0fb71ab3509aae979b853",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/payments-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "6580497e-917a-0742-9e43-7fe56d252790",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import {\\n  CancelOrderObject,\\n  ContractExpiryType,\\n  MarginType,\\n  Order,\\n  OrderConfiguration,\\n  OrderPlacementSource,\\n  OrderSide,\\n  ProductType,\\n  SortBy,\\n} from './common-types';\\n\\n// Create Order\\nexport type CreateOrderRequest = {\\n  // Body Params\\n  clientOrderId: string;\\n  productId: string;\\n  side: OrderSide;\\n  orderConfiguration: OrderConfiguration;\\n  selfTradePreventionId?: string;\\n  leverage?: string;\\n  marginType?: MarginType;\\n  retailPortfolioId?: string;\\n};\\n\\nexport type CreateOrderResponse = {\\n  success: boolean;\\n  failure_reason?: Record<string, any>; // deprecated\\n  order_id?: string; // deprecated\\n  response?:\\n    | { success_response: Record<string, any> }\\n    | { error_response: Record<string, any> };\\n  order_configuration?: OrderConfiguration;\\n};\\n\\n// Cancel Orders\\nexport type CancelOrdersRequest = {\\n  // Body Params\\n  orderIds: string[];\\n};\\n\\nexport type CancelOrdersResponse = {\\n  results?: CancelOrderObject[];\\n};\\n\\n// Edit Order\\nexport type EditOrderRequest = {\\n  // Body Params\\n  orderId: string;\\n  price?: string;\\n  size?: string;\\n};\\n\\nexport type EditOrderResponse = {\\n  success: boolean;\\n  response?:\\n    | { success_response: Record<string, any> } // deprecated\\n    | { error_response: Record<string, any> }; // deprecated\\n  errors?: Record<string, any>[];\\n};\\n\\n// Edit Order Preview\\nexport type EditOrderPreviewRequest = {\\n  // Body Params\\n  orderId: string;\\n  price?: string;\\n  size?: string;\\n};\\n\\nexport type EditOrderPreviewResponse = {\\n  errors: Record<string, any>[];\\n  slippage?: string;\\n  order_total?: string;\\n  commission_total?: string;\\n  quote_size?: string;\\n  base_size?: string;\\n  best_bid?: string;\\n  average_filled_price?: string;\\n};\\n\\n// List Orders\\nexport type ListOrdersRequest = {\\n  // Query Params\\n  orderIds?: string[];\\n  productIds?: string[];\\n  orderStatus?: string[];\\n  limit?: number;\\n  startDate?: string;\\n  endDate?: string;\\n  orderType?: string;\\n  orderSide?: OrderSide;\\n  cursor?: string;\\n  productType?: ProductType;\\n  orderPlacementSource?: OrderPlacementSource;\\n  contractExpiryType?: ContractExpiryType;\\n  assetFilters?: string[];\\n  retailPortfolioId?: string;\\n  timeInForces?: string;\\n  sortBy?: SortBy;\\n};\\n\\nexport type ListOrdersResponse = {\\n  orders: Order[];\\n  sequence?: number; // deprecated\\n  has_next: boolean;\\n  cursor?: string;\\n};\\n\\n// List Fills\\nexport type ListFillsRequest = {\\n  // Query Params\\n  orderIds?: string[];\\n  tradeIds?: string[];\\n  productIds?: string[];\\n  startSequenceTimestamp?: string;\\n  endSequenceTimestamp?: string;\\n  retailPortfolioId?: string;\\n  limit?: number;\\n  cursor?: string;\\n  sortBy?: SortBy;\\n};\\n\\nexport type ListFillsResponse = {\\n  fills?: Record<string, any>[];\\n  cursor?: string;\\n};\\n\\n// Get Order\\nexport type GetOrderRequest = {\\n  // Path Params\\n  orderId: string;\\n};\\n\\nexport type GetOrderResponse = {\\n  order?: Order;\\n};\\n\\n// Preview Order\\nexport type PreviewOrderRequest = {\\n  // Body Params\\n  productId: string;\\n  side: OrderSide;\\n  orderConfiguration: OrderConfiguration;\\n  leverage?: string;\\n  marginType?: MarginType;\\n  retailPortfolioId?: string;\\n};\\n\\nexport type PreviewOrderResponse = {\\n  order_total: string;\\n  commission_total: string;\\n  errs: Record<string, any>[];\\n  warning: Record<string, any>[];\\n  quote_size: string;\\n  base_size: string;\\n  best_bid: string;\\n  best_ask: string;\\n  is_max: boolean;\\n  order_margin_total?: string;\\n  leverage?: string;\\n  long_leverage?: string;\\n  short_leverage?: string;\\n  slippage?: string;\\n  preview_id?: string;\\n  current_liquidation_buffer?: string;\\n  projected_liquidation_buffer?: string;\\n  max_leverage?: string;\\n  pnl_configuration?: Record<string, any>;\\n};\\n\\n// Close Position\\nexport type ClosePositionRequest = {\\n  // Body Params\\n  clientOrderId: string;\\n  productId: string;\\n  size?: string;\\n};\\n\\nexport type ClosePositionResponse = {\\n  success: boolean;\\n  response?:\\n    | { success_response: Record<string, any> }\\n    | { error_response: Record<string, any> };\\n  order_configuration?: OrderConfiguration;\\n};\\n",
                hash: "59d418da4e0f52cf789c6afb6434d3da2da5a0ad9ba6b26aa0d80c880a25331b",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/orders-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "f823aa90-5c7b-0eaf-83b7-cf55dceb6f32",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import {\\n  FCMBalanceSummary,\\n  FCMPosition,\\n  FCMSweep,\\n  IntradayMarginSetting,\\n} from './common-types';\\n\\n// Get Futures Balance Summary\\nexport type GetFuturesBalanceSummaryResponse = {\\n  balance_summary?: FCMBalanceSummary;\\n};\\n\\n// Get Intraday Margin Setting\\nexport type GetIntradayMarginSettingResponse = {\\n  setting?: IntradayMarginSetting;\\n};\\n\\n// Set Intraday Margin Setting\\nexport type SetIntradayMarginSettingRequest = {\\n  // Body Params\\n  setting?: IntradayMarginSetting;\\n};\\n\\nexport type SetIntradayMarginSettingResponse = Record<string, never>;\\n\\n// Get Current Margin Window\\nexport type GetCurrentMarginWindowRequest = {\\n  // Query Params\\n  marginProfileType?: string;\\n};\\n\\nexport type GetCurrentMarginWindowResponse = {\\n  margin_window?: Record<string, any>;\\n  is_intraday_margin_killswitch_enabled?: boolean;\\n  is_intraday_margin_enrollment_killswitch_enabled?: boolean;\\n};\\n\\n// List Futures Positions\\nexport type ListFuturesPositionsResponse = {\\n  positions?: FCMPosition[];\\n};\\n\\n// Get Futures Position\\nexport type GetFuturesPositionRequest = {\\n  // Path Params\\n  productId: string;\\n};\\n\\nexport type GetFuturesPositionResponse = {\\n  position?: FCMPosition;\\n};\\n\\n// Schedule Futures Sweep\\nexport type ScheduleFuturesSweepRequest = {\\n  // Body Params\\n  usdAmount?: string;\\n};\\n\\nexport type ScheduleFuturesSweepResponse = {\\n  success?: boolean;\\n};\\n\\n// List Futures Sweeps\\nexport type ListFuturesSweepsResponse = {\\n  sweeps: FCMSweep[];\\n};\\n\\n// Cancel Pending Futures Sweep = {\\nexport type CancelPendingFuturesSweep = {\\n  success?: boolean;\\n};\\n",
                hash: "a4d7c8f4c27b647f89dd1ca49b07c7988e7d7a4b84bb4b74865318304ab62e1e",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/futures-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "bbbfef97-cd89-0b82-920d-62fd32d59d79",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { ContractExpiryType, ProductType, ProductVenue } from './common-types';\\n\\n// Get Transactions Summary\\nexport type GetTransactionsSummaryRequest = {\\n  // Query Params\\n  productType?: ProductType;\\n  contractExpiryType?: ContractExpiryType;\\n  productVenue?: ProductVenue;\\n};\\n\\nexport type GetTransactionsSummaryResponse = {\\n  total_volume: number;\\n  total_fees: number;\\n  fee_tier: Record<string, any>;\\n  margin_rate?: Record<string, any>;\\n  goods_and_services_tax?: Record<string, any>;\\n  advanced_trade_only_volumes?: number;\\n  advanced_trade_only_fees?: number;\\n  coinbase_pro_volume?: number; // deprecated\\n  coinbase_pro_fees?: number; // deprecated\\n  total_balance?: string;\\n  has_promo_fee?: boolean;\\n};\\n",
                hash: "cd15674c95e4ec0976dbbd273c6313d1d7df48d0516c31e78955a9f18efa2acc",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/fees-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "08be2faa-974c-0581-ae5f-226b5c6374b8",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { PortfolioType } from './common-types';\\n\\n// Get API Key Permissions\\nexport type GetAPIKeyPermissionsResponse = {\\n  can_view?: boolean;\\n  can_trade?: boolean;\\n  can_transfer?: boolean;\\n  portfolio_uuid?: string;\\n  portfolio_type?: PortfolioType;\\n};\\n",
                hash: "29c54bc75e3f714218f2c6ac09e59bcd8e4b5d884582a191950c8b098afc8d73",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/dataAPI-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "bafc768a-0188-0f86-8401-056cdf859e5b",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "// Create Convert Quote\\nimport { RatConvertTrade, TradeIncentiveMetadata } from './common-types';\\n\\nexport type CreateConvertQuoteRequest = {\\n  // Body Params\\n  fromAccount: string;\\n  toAccount: string;\\n  amount: string;\\n  tradeIncentiveMetadata?: TradeIncentiveMetadata;\\n};\\n\\nexport type CreateConvertQuoteResponse = {\\n  trade?: RatConvertTrade;\\n};\\n\\n// Get Convert Trade\\nexport type GetConvertTradeRequest = {\\n  // Path Params\\n  tradeId: string;\\n\\n  //Query Params\\n  fromAccount: string;\\n  toAccount: string;\\n};\\n\\nexport type GetConvertTradeResponse = {\\n  trade?: RatConvertTrade;\\n};\\n\\n// Commit Convert Trade\\nexport type CommitConvertTradeRequest = {\\n  // Path Params\\n  tradeId: string;\\n\\n  // Body Params\\n  fromAccount: string;\\n  toAccount: string;\\n};\\n\\nexport type CommitConvertTradeResponse = {\\n  trade?: RatConvertTrade;\\n};\\n",
                hash: "4de4e5f147a1fdf12dcbf5ab96862c8646e7f6d6d7ce86b60d1f4f02d4c83696",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/converts-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "7319e805-53ba-0590-a468-f7a9af7b1e87",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "// ----- ENUMS -----\\nexport enum ProductType {\\n  UNKNOWN = 'UNKNOWN_PRODUCT_TYPE',\\n  SPOT = 'SPOT',\\n  FUTURE = 'FUTURE',\\n}\\n\\nexport enum ContractExpiryType {\\n  UNKNOWN = 'UNKNOWN_CONTRACT_EXPIRY_TYPE',\\n  EXPIRING = 'EXPIRING',\\n  PERPETUAL = 'PERPETUAL',\\n}\\n\\nexport enum ExpiringContractStatus {\\n  UNKNOWN = 'UNKNOWN_EXPIRING_CONTRACT_STATUS',\\n  UNEXPIRED = 'STATUS_UNEXPIRED',\\n  EXPIRED = 'STATUS_EXPIRED',\\n  ALL = 'STATUS_ALL',\\n}\\n\\nexport enum PortfolioType {\\n  UNDEFINED = 'UNDEFINED',\\n  DEFAULT = 'DEFAULT',\\n  CONSUMER = 'CONSUMER',\\n  INTX = 'INTX',\\n}\\n\\nexport enum MarginType {\\n  CROSS = 'CROSS',\\n  ISOLATED = 'ISOLATED',\\n}\\n\\nexport enum OrderPlacementSource {\\n  UNKNOWN = 'UNKNOWN_PLACEMENT_SOURCE',\\n  RETAIL_SIMPLE = 'RETAIL_SIMPLE',\\n  RETAIL_ADVANCED = 'RETAIL_ADVANCED',\\n}\\n\\nexport enum SortBy {\\n  UNKNOWN = 'UNKNOWN_SORT_BY',\\n  LIMIT_PRICE = 'LIMIT_PRICE',\\n  LAST_FILL_TIME = 'LAST_FILL_TIME',\\n}\\n\\nexport enum OrderSide {\\n  BUY = 'BUY',\\n  SELL = 'SELL',\\n}\\n\\nexport enum StopDirection {\\n  UP = 'STOP_DIRECTION_STOP_UP',\\n  DOWN = 'STOP_DIRECTION_STOP_DOWN',\\n}\\n\\nexport enum Granularity {\\n  UNKNOWN = 'UNKNOWN_GRANULARITY',\\n  ONE_MINUTE = 'ONE_MINUTE',\\n  FIVE_MINUTE = 'FIVE_MINUTE',\\n  FIFTEEN_MINUTE = 'FIFTEEN_MINUTE',\\n  THIRTY_MINUTE = 'THIRTY_MINUTE',\\n  ONE_HOUR = 'ONE_HOUR',\\n  TWO_HOUR = 'TWO_HOUR',\\n  SIX_HOUR = 'SIX_HOUR',\\n  ONE_DAY = 'ONE_DAY',\\n}\\n\\nexport enum ProductVenue {\\n  UNKNOWN = 'UNKNOWN_VENUE_TYPE',\\n  CBE = 'CBE',\\n  FCM = 'FCM',\\n  INTX = 'INTX',\\n}\\n\\nexport enum IntradayMarginSetting {\\n  UNSPECIFIED = 'INTRADAY_MARGIN_SETTING_UNSPECIFIED',\\n  STANDARD = 'INTRADAY_MARGIN_SETTING_STANDARD',\\n  INTRADAY = 'INTRADAY_MARGIN_SETTING_INTRADAY',\\n}\\n\\n// ----- TYPES -----\\nexport type Account = {\\n  uuid?: string;\\n  name?: string;\\n  currency?: string;\\n  available_balance?: Record<string, any>;\\n  default?: boolean;\\n  active?: boolean;\\n  created_at?: string;\\n  updated_at?: string;\\n  deleted_at?: string;\\n  type?: Record<string, any>;\\n  ready?: boolean;\\n  hold?: Record<string, any>;\\n  retail_portfolio_id?: string;\\n};\\n\\nexport type TradeIncentiveMetadata = {\\n  userIncentiveId?: string;\\n  codeVal?: string;\\n};\\n\\nexport type OrderConfiguration =\\n  | { market_market_ioc: MarketMarketIoc }\\n  | { sor_limit_ioc: SorLimitIoc }\\n  | { limit_limit_gtc: LimitLimitGtc }\\n  | { limit_limit_gtd: LimitLimitGtd }\\n  | { limit_limit_fok: LimitLimitFok }\\n  | { stop_limit_stop_limit_gtc: StopLimitStopLimitGtc }\\n  | { stop_limit_stop_limit_gtd: StopLimitStopLimitGtd }\\n  | { trigger_bracket_gtc: TriggerBracketGtc }\\n  | { trigger_bracket_gtd: TriggerBracketGtd };\\n\\nexport type MarketMarketIoc = { quote_size: string } | { base_size: string };\\n\\nexport type SorLimitIoc = {\\n  baseSize: string;\\n  limitPrice: string;\\n};\\n\\nexport type LimitLimitGtc = {\\n  baseSize: string;\\n  limitPrice: string;\\n  postOnly: boolean;\\n};\\n\\nexport type LimitLimitGtd = {\\n  baseSize: string;\\n  limitPrice: string;\\n  endTime: string;\\n  postOnly: boolean;\\n};\\n\\nexport type LimitLimitFok = {\\n  baseSize: string;\\n  limitPrice: string;\\n};\\n\\nexport type StopLimitStopLimitGtc = {\\n  baseSize: string;\\n  limitPrice: string;\\n  stopPrice: string;\\n  stopDirection: StopDirection;\\n};\\n\\nexport type StopLimitStopLimitGtd = {\\n  baseSize: string;\\n  limitPrice: string;\\n  stopPrice: string;\\n  endTime: string;\\n  stopDirection: StopDirection;\\n};\\n\\nexport type TriggerBracketGtc = {\\n  baseSize: string;\\n  limitPrice: string;\\n  stopTriggerPrice: string;\\n};\\n\\nexport type TriggerBracketGtd = {\\n  baseSize: string;\\n  limitPrice: string;\\n  stopTriggerPrice: string;\\n  endTime: string;\\n};\\n\\nexport type RatConvertTrade = {\\n  id?: string;\\n  status?: Record<string, any>;\\n  user_entered_amount?: Record<string, any>;\\n  amount?: Record<string, any>;\\n  subtotal?: Record<string, any>;\\n  total?: Record<string, any>;\\n  fees?: Record<string, any>;\\n  total_fee?: Record<string, any>;\\n  source?: Record<string, any>;\\n  target?: Record<string, any>;\\n  unit_price?: Record<string, any>;\\n  user_warnings?: Record<string, any>;\\n  user_reference?: string;\\n  source_curency?: string;\\n  cancellation_reason?: Record<string, any>;\\n  source_id?: string;\\n  target_id?: string;\\n  subscription_info?: Record<string, any>;\\n  exchange_rate?: Record<string, any>;\\n  tax_details?: Record<string, any>;\\n  trade_incentive_info?: Record<string, any>;\\n  total_fee_without_tax?: Record<string, any>;\\n  fiat_denoted_total?: Record<string, any>;\\n};\\n\\nexport type FCMBalanceSummary = {\\n  futures_buying_power?: Record<string, any>;\\n  total_usd_balance?: Record<string, any>;\\n  cbi_usd_balance?: Record<string, any>;\\n  cfm_usd_balance?: Record<string, any>;\\n  total_open_orders_hold_amount?: Record<string, any>;\\n  unrealized_pnl?: Record<string, any>;\\n  daily_realized_pnl?: Record<string, any>;\\n  initial_margin?: Record<string, any>;\\n  available_margin?: Record<string, any>;\\n  liquidation_threshold?: Record<string, any>;\\n  liquidation_buffer_amount?: Record<string, any>;\\n  liquidation_buffer_percentage?: string;\\n  intraday_margin_window_measure?: Record<string, any>;\\n  overnight_margin_window_measure?: Record<string, any>;\\n};\\n\\nexport type FCMPosition = {\\n  product_id?: string;\\n  expiration_time?: Record<string, any>;\\n  side?: Record<string, any>;\\n  number_of_contracts?: string;\\n  current_price?: string;\\n  avg_entry_price?: string;\\n  unrealized_pnl?: string;\\n  daily_realized_pnl?: string;\\n};\\n\\nexport type FCMSweep = {\\n  id: string;\\n  requested_amount: Record<string, any>;\\n  should_sweep_all: boolean;\\n  status: Record<string, any>;\\n  schedule_time: Record<string, any>;\\n};\\n\\nexport type CancelOrderObject = {\\n  success: boolean;\\n  failure_reason: Record<string, any>;\\n  order_id: string;\\n};\\n\\nexport type Order = {\\n  order_id: string;\\n  product_id: string;\\n  user_id: string;\\n  order_configuration: OrderConfiguration;\\n  side: OrderSide;\\n  client_order_id: string;\\n  status: Record<string, any>;\\n  time_in_force?: Record<string, any>;\\n  created_time: Record<string, any>;\\n  completion_percentage: string;\\n  filled_size?: string;\\n  average_filled_price: string;\\n  fee?: string;\\n  number_of_fills: string;\\n  filled_value?: string;\\n  pending_cancel: boolean;\\n  size_in_quote: boolean;\\n  total_fees: string;\\n  size_inclusive_of_fees: boolean;\\n  total_value_after_fees: string;\\n  trigger_status?: Record<string, any>;\\n  order_type?: Record<string, any>;\\n  reject_reason?: Record<string, any>;\\n  settled?: boolean;\\n  product_type?: ProductType;\\n  reject_message?: string;\\n  cancel_message?: string;\\n  order_placement_source?: OrderPlacementSource;\\n  outstanding_hold_amount?: string;\\n  is_liquidation?: boolean;\\n  last_fill_time?: Record<string, any>;\\n  edit_history?: Record<string, any>[];\\n  leverage?: string;\\n  margin_type?: MarginType;\\n  retail_portfolio_id?: string;\\n  originating_order_id?: string;\\n  attached_order_id?: string;\\n};\\n\\nexport type PaymentMethod = {\\n  id?: string;\\n  type?: string;\\n  name?: string;\\n  currency?: string;\\n  verified?: boolean;\\n  allow_buy?: boolean;\\n  allow_sell?: boolean;\\n  allow_deposit?: boolean;\\n  allow_withdraw?: boolean;\\n  created_at?: string;\\n  updated_at?: string;\\n};\\n\\nexport type PerpetualPortfolio = {\\n  portfolio_uuid?: string;\\n  collateral?: string;\\n  position_notional?: string;\\n  open_position_notional?: string;\\n  pending_fees?: string;\\n  borrow?: string;\\n  accrued_interest?: string;\\n  rolling_debt?: string;\\n  portfolio_initial_margin?: string;\\n  portfolio_im_notional?: Record<string, any>;\\n  liquidation_percentage?: string;\\n  liquidation_buffer?: string;\\n  margin_type?: Record<string, any>;\\n  margin_flags?: Record<string, any>;\\n  liquidation_status?: Record<string, any>;\\n  unrealized_pnl?: Record<string, any>;\\n  total_balance?: Record<string, any>;\\n};\\n\\nexport type PortfolioSummary = {\\n  unrealized_pnl?: Record<string, any>;\\n  buying_power?: Record<string, any>;\\n  total_balance?: Record<string, any>;\\n  max_withdrawal_amount?: Record<string, any>;\\n};\\n\\nexport type PositionSummary = {\\n  aggregated_pnl?: Record<string, any>;\\n};\\n\\nexport type Position = {\\n  product_id?: string;\\n  product_uuid?: string;\\n  portfolio_uuid?: string;\\n  symbol?: string;\\n  vwap?: Record<string, any>;\\n  entry_vwap?: Record<string, any>;\\n  position_side?: Record<string, any>;\\n  margin_type?: Record<string, any>;\\n  net_size?: string;\\n  buy_order_size?: string;\\n  sell_order_size?: string;\\n  im_contribution?: string;\\n  unrealized_pnl?: Record<string, any>;\\n  mark_price?: Record<string, any>;\\n  liquidation_price?: Record<string, any>;\\n  leverage?: string;\\n  im_notional?: Record<string, any>;\\n  mm_notional?: Record<string, any>;\\n  position_notional?: Record<string, any>;\\n  aggregated_pnl?: Record<string, any>;\\n};\\n\\nexport type Balance = {\\n  asset: Record<string, any>;\\n  quantity: string;\\n  hold: string;\\n  transfer_hold: string;\\n  collateral_value: string;\\n  collateral_weight: string;\\n  max_withdraw_amount: string;\\n  loan: string;\\n  loan_collateral_requirement_usd: string;\\n  pledged_quantity: string;\\n};\\n\\nexport type Portfolio = {\\n  name?: string;\\n  uuid?: string;\\n  type?: string;\\n};\\n\\nexport type PortfolioBreakdown = {\\n  portfolio?: Portfolio;\\n  portfolio_balances?: Record<string, any>;\\n  spot_positions?: Record<string, any>[];\\n  perp_positions?: Record<string, any>[];\\n  futures_positions?: Record<string, any>[];\\n};\\n\\nexport type PriceBook = {\\n  product_id: string;\\n  bids: Record<string, any>[];\\n  asks: Record<string, any>[];\\n  time?: Record<string, any>;\\n};\\n\\nexport type Products = {\\n  products?: Product[];\\n  num_products?: number;\\n};\\n\\nexport type Product = {\\n  product_id: string;\\n  price: string;\\n  price_percentage_change_24h: string;\\n  volume_24h: string;\\n  volume_percentage_change_24h: string;\\n  base_increment: string;\\n  quote_increment: string;\\n  quote_min_size: string;\\n  quote_max_size: string;\\n  base_min_size: string;\\n  base_max_size: string;\\n  base_name: string;\\n  quote_name: string;\\n  watched: boolean;\\n  is_disabled: boolean;\\n  new: boolean;\\n  status: string;\\n  cancel_only: boolean;\\n  limit_only: boolean;\\n  post_only: boolean;\\n  trading_disabled: boolean;\\n  auction_mode: boolean;\\n  product_type?: ProductType;\\n  quote_currency_id?: string;\\n  base_currency_id?: string;\\n  fcm_trading_session_details?: Record<string, any>;\\n  mid_market_price?: string;\\n  alias?: string;\\n  alias_to?: string[];\\n  base_display_symbol: string;\\n  quote_display_symbol?: string;\\n  view_only?: boolean;\\n  price_increment?: string;\\n  display_name?: string;\\n  product_venue?: ProductVenue;\\n  approximate_quote_24h_volume?: string;\\n  future_product_details?: Record<string, any>;\\n};\\n\\nexport type Candles = {\\n  candles?: Candle[];\\n};\\n\\nexport type Candle = {\\n  start?: string;\\n  low?: string;\\n  high?: string;\\n  open?: string;\\n  close?: string;\\n  volume?: string;\\n};\\n\\nexport type HistoricalMarketTrade = {\\n  trade_id?: string;\\n  product_id?: string;\\n  price?: string;\\n  size?: string;\\n  time?: string;\\n  side?: OrderSide;\\n};\\n\\nexport type PortfolioBalance = {\\n  portfolio_uuid?: string;\\n  balances?: Balance[];\\n  is_margin_limit_reached?: boolean;\\n};\\n",
                hash: "4a98601a73e77ed580d94ba3c6b64284b3a2d7bedbd91d130495b7bc5d4192f1",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/common-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
        {
            id: "9f741245-80c0-0198-b10d-10a37b4b2db2",
            userId: "12dea96f-ec20-0935-a6ab-75692c994959",
            agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
            roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
            content: {
                text: "import { Account } from './common-types';\\n\\n// Get Account\\nexport type GetAccountRequest = {\\n  // Path Params\\n  accountUuid: string;\\n};\\n\\nexport type GetAccountResponse = {\\n  account?: Account;\\n};\\n\\n// List Accounts\\nexport type ListAccountsRequest = {\\n  // Query Params\\n  limit?: number;\\n  cursor?: string;\\n  retailPortfolioId?: string;\\n};\\n\\nexport type ListAccountsResponse = {\\n  accounts?: Account[];\\n  has_next: boolean;\\n  cursor?: string;\\n  size?: number;\\n};\\n",
                hash: "801866a4ecf77cb43775cf280d614c15a1ed7c34d72ddca554673fe669aee103",
                source: "github",
                attachments: [],
                metadata: {
                    path: "packages/plugin-coinbase/advanced-sdk-ts/src/rest/types/accounts-types.ts",
                    repo: "eliza",
                    owner: "elizaOS",
                },
            },
        },
    ];
    // elizaLogger.info("Memories:", memories);
    return memories.map(
        (memory) => `File: ${(memory.content.metadata as any)?.path}
        Content: ${memory.content.text.replace(/\n/g, "\\n")}
        `
    );
};

export async function getIssuesFromMemories(
    runtime: IAgentRuntime,
    owner: string,
    repo: string,
    branch: string
): Promise<Memory[]> {
    const roomId = stringToUuid(`github-${owner}-${repo}-${branch}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
        count: 1000,
    });
    // elizaLogger.log("Memories:", memories);
    await fs.writeFile(
        "/tmp/getIssuesFromMemories.txt",
        JSON.stringify(memories, null, 2)
    );
    // Filter memories to only include those that are issues
    const issueMemories = memories.filter(
        (memory) => (memory.content.metadata as any)?.type === "issue"
    );
    return issueMemories;
}

export const getIssueFromMemories = async (
    runtime: IAgentRuntime,
    message: Memory,
    issueNumber: number
): Promise<Memory | null> => {
    const roomId = message.roomId;
    const memories = await runtime.messageManager.getMemories({
        roomId,
        count: 1000,
    });
    const issueId = stringToUuid(
        `${roomId}-${runtime.agentId}-issue-${issueNumber}`
    );
    return memories.find((memory) => memory.id === issueId) ?? null;
};

export const getPullRequestFromMemories = async (
    runtime: IAgentRuntime,
    message: Memory,
    pullRequestNumber: number
): Promise<Memory | null> => {
    const roomId = message.roomId;
    const memories = await runtime.messageManager.getMemories({
        roomId,
        count: 1000,
    });
    const prId = stringToUuid(
        `${roomId}-${runtime.agentId}-pr-${pullRequestNumber}`
    );
    return memories.find((memory) => memory.id === prId) ?? null;
};

export async function saveIssueToMemory(
    runtime: IAgentRuntime,
    issue: RestEndpointMethodTypes["issues"]["create"]["response"]["data"],
    owner: string,
    repo: string,
    branch: string
): Promise<Memory> {
    const roomId = stringToUuid(`github-${owner}-${repo}-${branch}`);
    const issueId = stringToUuid(
        `${roomId}-${runtime.agentId}-issue-${issue.number}`
    );
    const issueMemory: Memory = {
        id: issueId,
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: roomId,
        content: {
            text: `Issue Created: ${issue.title}`,
            action: "CREATE_ISSUE",
            source: "github",
            metadata: {
                type: "issue",
                url: issue.html_url,
                number: issue.number,
                state: issue.state,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                comments: issue.comments,
                labels: issue.labels.map((label: any) =>
                    typeof label === "string" ? label : label?.name
                ),
                body: issue.body,
            },
        },
    };

    // elizaLogger.log("Issue memory:", issueMemory);
    await fs.writeFile(
        `/tmp/saveIssueToMemory-issueMemory-${issue.number}.txt`,
        JSON.stringify(issueMemory, null, 2)
    );

    await runtime.messageManager.createMemory(issueMemory);

    return issueMemory;
}

export const saveIssuesToMemory = async (
    runtime: IAgentRuntime,
    owner: string,
    repository: string,
    branch: string,
    apiToken: string,
    limit: number = 999999
): Promise<Memory[]> => {
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        branch: branch,
        auth: apiToken,
    });
    const allIssues = await githubService.getIssues();
    elizaLogger.log(`Total issues found: ${allIssues.length}`);
    const issues = allIssues.slice(0, Math.min(limit, allIssues.length));
    // await fs.writeFile("/tmp/issues.txt", JSON.stringify(issues, null, 2));
    const issuesMemories: Memory[] = [];
    // create memories for each issue if they are not already in the memories
    for (const issue of issues) {
        // check if the issue is already in the memories by checking id in the memories

        // const issueMemory = memories.find(
        //     (memory) =>
        //         memory.id ===
        //         stringToUuid(
        //             `${roomId}-${runtime.agentId}-issue-${issue.number}`
        //         )
        // );
        // if (!issueMemory) {
        const newIssueMemory = await saveIssueToMemory(
            runtime,
            issue,
            owner,
            repository,
            branch
        );

        issuesMemories.push(newIssueMemory);
        // } else {
        //     elizaLogger.log("Issue already in memories:", issueMemory);
        //     // update the issue memory
        // }
    }
    // await fs.writeFile("/tmp/issuesMemories.txt", JSON.stringify(issuesMemories, null, 2));
    return issuesMemories;
};

export async function incorporateRepositoryState(
    state: State,
    runtime: IAgentRuntime,
    message: Memory,
    relevantMemories: Memory[],
    isIssuesFlow: boolean,
    isPullRequestsFlow: boolean
) {
    const files = await getFilesFromMemories(runtime, message);
    await fs.writeFile("/tmp/files.txt", JSON.stringify(files, null, 2));
    state.files = files;
    state.messageExamples = JSON.stringify(
        runtime.character?.messageExamples,
        null,
        2
    );
    state.system = runtime.character?.system;
    state.topics = JSON.stringify(runtime.character?.topics, null, 2);
    state.style = JSON.stringify(runtime.character?.style, null, 2);
    state.adjectives = JSON.stringify(runtime.character?.adjectives, null, 2);
    const sanitizedMemories = sanitizeMemories(relevantMemories);
    state.relevantMemories = JSON.stringify(sanitizedMemories, null, 2);
    // Doesn't exist in character or state but we want it in state
    // state.facts = JSON.stringify(
    //     sanitizeMemories(
    //         (await runtime.messageManager.getMemories({
    //             roomId: message.roomId,
    //         })).filter(
    //             (memory) =>
    //                 !["issue", "pull_request"].includes((memory.content.metadata as any)?.type)
    //         )
    //     ),
    //     null,
    //     2
    // );
    // TODO:
    // We need to actually save goals, knowledge,facts, we only save memories for now
    // We need to dynamically update the goals, knoweldge, facts, bio, lore, we should add actions to update these and chain them to the OODA cycle
    const owner = runtime.getSetting("GITHUB_OWNER") ?? ("" as string);
    state.owner = owner;
    const repository = runtime.getSetting("GITHUB_REPO") ?? ("" as string);
    state.repository = repository;
    const branch = runtime.getSetting("GITHUB_BRANCH") ?? ("main" as string);
    state.branch = branch;
    state.message = message.content.text;
    if (owner === "" || repository === "" || branch === "") {
        elizaLogger.error(
            "GITHUB_OWNER or GITHUB_REPO or GITHUB_BRANCH is not set, skipping OODA cycle."
        );
        throw new Error("GITHUB_OWNER or GITHUB_REPO is not set");
    }
    if (isIssuesFlow) {
        const previousIssues = await getIssuesFromMemories(
            runtime,
            owner,
            repository,
            branch
        );
        await fs.writeFile(
            "/tmp/plugin-github-previousIssues.txt",
            JSON.stringify(previousIssues, null, 2)
        );
        state.previousIssues = JSON.stringify(
            previousIssues.map((issue) => ({
                title: issue.content.text,
                body: (issue.content.metadata as any).body,
                url: (issue.content.metadata as any).url,
                number: (issue.content.metadata as any).number,
                state: (issue.content.metadata as any).state,
            })),
            null,
            2
        );
    }

    if (isPullRequestsFlow) {
        const previousPRs = await getPullRequestsFromMemories(
            runtime,
            owner,
            repository,
            branch
        );
        // await fs.writeFile("/tmp/previousPRs.txt", JSON.stringify(previousPRs, null, 2));
        state.previousPRs = JSON.stringify(
            previousPRs.map((pr) => ({
                title: pr.content.text,
                body: (pr.content.metadata as any).body,
                url: (pr.content.metadata as any).url,
                number: (pr.content.metadata as any).number,
                state: (pr.content.metadata as any).state,
                diff: (pr.content.metadata as any).diff,
                comments: (pr.content.metadata as any).comments,
            })),
            null,
            2
        );
    }
    return state;
}

export async function getPullRequestsFromMemories(
    runtime: IAgentRuntime,
    owner: string,
    repo: string,
    branch: string
): Promise<Memory[]> {
    const roomId = stringToUuid(`github-${owner}-${repo}-${branch}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
        count: 1000,
    });
    // Filter memories to only include those that are pull requests
    const prMemories = memories.filter(
        (memory) => (memory.content.metadata as any)?.type === "pull_request"
    );
    return prMemories;
}

export const getRepositoryRoomId = (runtime: IAgentRuntime): UUID => {
    const owner = runtime.getSetting("GITHUB_OWNER") ?? ("" as string);
    const repository = runtime.getSetting("GITHUB_REPO") ?? ("" as string);
    const branch = runtime.getSetting("GITHUB_BRANCH") ?? ("main" as string);
    if (owner === "" || repository === "" || branch === "") {
        elizaLogger.error(
            "GITHUB_OWNER or GITHUB_REPO is not set, skipping OODA cycle."
        );
        throw new Error("GITHUB_OWNER or GITHUB_REPO is not set");
    }
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
    elizaLogger.log("Generated repository room ID:", roomId);
    return roomId;
};

function sanitizeMemories(memories: Memory[]): Partial<Memory>[] {
    return memories.map((memory) => ({
        content: memory.content,
        roomId: memory.roomId,
        createdAt: memory.createdAt,
        // we could remove these for if hitting token limit
        userId: memory.userId,
        agentId: memory.agentId,
        similarity: memory.similarity,
    }));
}

export const createTemplate = (
    prompt: string,
    output: string,
    examples: string
) => {
    return `
${prompt}

${contextTemplate}

${output}

${examples}
`;
};

export async function savePullRequestToMemory(
    runtime: IAgentRuntime,
    pullRequest: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][number],
    owner: string,
    repository: string,
    branch: string,
    apiToken: string
): Promise<Memory> {
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        auth: apiToken,
    });
    const prId = stringToUuid(
        `${roomId}-${runtime.agentId}-pr-${pullRequest.number}`
    );
    const prMemory: Memory = {
        id: prId,
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: roomId,
        content: {
            text: `Pull Request Created: ${pullRequest.title}`,
            metadata: await getPullRequestMetadata(pullRequest, githubService),
        },
    };

    await runtime.messageManager.createMemory(prMemory);
    return prMemory;
}

export async function saveCreatedPullRequestToMemory(
    runtime: IAgentRuntime,
    pullRequest: RestEndpointMethodTypes["pulls"]["create"]["response"]["data"],
    owner: string,
    repository: string,
    branch: string,
    apiToken: string
): Promise<Memory> {
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        auth: apiToken,
    });
    const prId = stringToUuid(
        `${roomId}-${runtime.agentId}-pr-${pullRequest.number}`
    );
    const prMemory: Memory = {
        id: prId,
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: roomId,
        content: {
            text: `Pull Request Created: ${pullRequest.title}`,
            metadata: await getCreatedPullRequestMetadata(
                pullRequest,
                githubService
            ),
        },
    };

    await runtime.messageManager.createMemory(prMemory);
    return prMemory;
}

export const savePullRequestsToMemory = async (
    runtime: IAgentRuntime,
    owner: string,
    repository: string,
    branch: string,
    apiToken: string,
    limit: number = 999999
): Promise<Memory[]> => {
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        auth: apiToken,
    });
    const allPullRequests = await githubService.getPullRequests();
    const pullRequests = allPullRequests.slice(
        0,
        Math.min(limit, allPullRequests.length)
    );
    const pullRequestsMemories: Memory[] = [];
    // create memories for each pull request if they are not already in the memories
    for (const pr of pullRequests) {
        // check if the pull request is already in the memories by checking id in the memories

        const prMemory =
            memories.find(
                (memory) =>
                    memory.id ===
                    stringToUuid(`${roomId}-${runtime.agentId}-pr-${pr.number}`)
            ) ?? null;
        if (!prMemory) {
            const newPrMemory = await savePullRequestToMemory(
                runtime,
                pr,
                owner,
                repository,
                branch,
                apiToken
            );
            pullRequestsMemories.push(newPrMemory);
        } else {
            elizaLogger.log("Pull request already in memories:", prMemory);
            // update the pull request memory
        }
    }
    // elizaLogger.log("Pull requests memories:", pullRequestsMemories);
    await fs.writeFile(
        "/tmp/savePullRequestsToMemory-pullRequestsMemories.txt",
        JSON.stringify(pullRequestsMemories, null, 2)
    );
    return pullRequestsMemories;
};

export async function getPullRequestMetadata(
    pullRequest: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][number],
    githubService: GitHubService
): Promise<any> {
    return {
        type: "pull_request",
        url: pullRequest.html_url,
        number: pullRequest.number,
        state: pullRequest.state,
        created_at: pullRequest.created_at,
        updated_at: pullRequest.updated_at,
        comments: await githubService.getPRCommentsText(
            pullRequest.comments_url
        ),
        labels: pullRequest.labels.map((label: any) =>
            typeof label === "string" ? label : label?.name
        ),
        body: pullRequest.body,
        diff:
            pullRequest.number !== 158 // TODO: ignore WIP PRs that contains big diffs
                ? await githubService.getPRDiffText(pullRequest.url)
                : "<diff truncated>",
    };
}

export async function getCreatedPullRequestMetadata(
    pullRequest: RestEndpointMethodTypes["pulls"]["create"]["response"]["data"],
    githubService: GitHubService
): Promise<any> {
    return {
        type: "pull_request",
        url: pullRequest.html_url,
        number: pullRequest.number,
        state: pullRequest.state,
        created_at: pullRequest.created_at,
        updated_at: pullRequest.updated_at,
        comments: await githubService.getPRCommentsText(
            pullRequest.comments_url
        ),
        labels: pullRequest.labels.map((label: any) =>
            typeof label === "string" ? label : label?.name
        ),
        body: pullRequest.body,
        diff: await githubService.getPRDiffText(pullRequest.diff_url),
    };
}
